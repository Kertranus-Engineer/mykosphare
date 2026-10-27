#include "ControlSync.h"
#include "CloudTransport.h"
#include "LocalController.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_idf_version.h>
#include <esp_task_wdt.h>
#include <sys/time.h>
#include <time.h>

#if __has_include("CloudConfig.local.h")
#include "CloudConfig.local.h"
#else
#include "CloudConfig.example.h"
#endif

using namespace myko;

namespace {
constexpr unsigned long SYNC_INTERVAL_MS = 30000;
constexpr unsigned long SYNC_FIRST_DELAY_MS = 15000;
constexpr unsigned long WATCHDOG_MS = 20000;
constexpr size_t MAX_EVENTS = 20;
constexpr uint32_t MIN_FREE_HEAP = 70000;
constexpr char FIRMWARE[] = "cloud-v1+ctl0-sim";

Controller controller;
SemaphoreHandle_t ctlMux = nullptr;
Preferences prefs;
char bootId[9] = "00000000";
char syncUrl[200] = "";
uint32_t receivedVersion = 0;
char lastError[64] = "";
bool syncStarted = false;

float lastTemperature = NAN, lastHumidity = NAN;
unsigned long lastSampleMs = 0;
bool lastValid = false;
unsigned long lastStepMs = 0;

Event pending[MAX_EVENTS];
size_t pendingCount = 0;

const char *modeText(Mode m) {
  switch (m) {
    case Mode::Observation: return "observation";
    case Mode::Simulation: return "simulation";
    case Mode::Assisted: return "assisted";
    case Mode::Automatic: return "automatic";
  }
  return "observation";
}
bool modeFrom(const char *s, Mode &out) {
  if (!s) return false;
  if (!strcmp(s, "observation")) out = Mode::Observation;
  else if (!strcmp(s, "simulation")) out = Mode::Simulation;
  else if (!strcmp(s, "assisted")) out = Mode::Assisted;
  else if (!strcmp(s, "automatic")) out = Mode::Automatic;
  else return false;
  return true;
}
const char *stateText(ControllerState s) {
  switch (s) {
    case ControllerState::Idle: return "idle";
    case ControllerState::Holding: return "holding";
    case ControllerState::Safe: return "safe";
    case ControllerState::Fault: return "fault";
  }
  return "idle";
}
const char *kindText(EventKind k) {
  switch (k) {
    case EventKind::Boot: return "boot";
    case EventKind::ConfigReceived: return "config_received";
    case EventKind::ConfigApplied: return "config_applied";
    case EventKind::ConfigRejected: return "config_rejected";
    case EventKind::Decision: return "decision";
    case EventKind::Actuation: return "actuation";
    case EventKind::Safety: return "safety";
    case EventKind::Error: return "error";
  }
  return "error";
}
const char *channelText(uint8_t c) {
  switch (c) {
    case kHumidifier: return "humidifier";
    case kFanExhaust: return "fan_exhaust";
    case kFanIntake: return "fan_intake";
  }
  return "unknown";
}

void setError(const char *text) { snprintf(lastError, sizeof(lastError), "%s", text); }

void lock() { xSemaphoreTake(ctlMux, portMAX_DELAY); }
void unlock() { xSemaphoreGive(ctlMux); }

// ── persistence of the last VALID config (survives reboot and loss of internet) ──
void saveConfig(const Config &c) {
  if (!prefs.begin("myko-ctl", false)) return;
  prefs.putUInt("ver", c.version);
  prefs.putUChar("mode", static_cast<uint8_t>(c.mode));
  prefs.putBool("tset", c.targets.temperature.set);
  prefs.putFloat("tmin", c.targets.temperature.min);
  prefs.putFloat("tmax", c.targets.temperature.max);
  prefs.putBool("hset", c.targets.humidity.set);
  prefs.putFloat("hmin", c.targets.humidity.min);
  prefs.putFloat("hmax", c.targets.humidity.max);
  prefs.end();
}

bool loadConfig(Config &c) {
  if (!prefs.begin("myko-ctl", true)) return false;
  c.version = prefs.getUInt("ver", 0);
  const uint8_t mode = prefs.getUChar("mode", 0);
  c.mode = mode <= 3 ? static_cast<Mode>(mode) : Mode::Observation;
  c.targets.temperature = {prefs.getBool("tset", false), prefs.getFloat("tmin", NAN), prefs.getFloat("tmax", NAN)};
  c.targets.humidity = {prefs.getBool("hset", false), prefs.getFloat("hmin", NAN), prefs.getFloat("hmax", NAN)};
  prefs.end();
  return c.version > 0;
}

bool timeValid() { return time(nullptr) > 1760000000; }

void isoFromBoot(uint32_t atMs, uint32_t nowMs, char *out, size_t size) {
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  int64_t epochMs = static_cast<int64_t>(tv.tv_sec) * 1000 + tv.tv_usec / 1000 - static_cast<int64_t>(nowMs - atMs);
  const time_t seconds = static_cast<time_t>(epochMs / 1000);
  struct tm utc;
  gmtime_r(&seconds, &utc);
  char base[24];
  strftime(base, sizeof(base), "%Y-%m-%dT%H:%M:%S", &utc);
  snprintf(out, size, "%s.%03dZ", base, static_cast<int>(epochMs % 1000));
}

void addEvent(JsonArray &list, const Event &e, uint32_t nowMs) {
  JsonObject o = list.add<JsonObject>();
  char key[16], at[32];
  snprintf(key, sizeof(key), "s%lu", static_cast<unsigned long>(e.seq));
  isoFromBoot(e.atMs, nowMs, at, sizeof(at));
  o["key"] = key;
  o["at"] = at;
  o["kind"] = kindText(e.kind);
  o["simulated"] = true;  // this build cannot drive an output, so nothing it logs is a real actuation
  if (e.version > 0) o["version"] = e.version; else o["version"] = nullptr;
  JsonObject d = o["detail"].to<JsonObject>();
  switch (e.kind) {
    case EventKind::Actuation:
      d["actuator"] = channelText(e.channel);
      d["command"] = e.on ? "on" : "off";
      d["reason"] = reasonText(e.reason);
      if (isfinite(e.value)) d["value"] = roundf(e.value * 10.0f) / 10.0f;
      break;
    case EventKind::ConfigRejected: d["error"] = configErrorText(e.error); break;
    case EventKind::Safety: d["reason"] = reasonText(e.reason); break;
    default: break;
  }
}

bool parseConfig(JsonObjectConst cfg, Config &out) {
  Mode mode;
  if (!cfg["version"].is<uint32_t>() || !modeFrom(cfg["mode"] | static_cast<const char *>(nullptr), mode)) return false;
  out.version = cfg["version"].as<uint32_t>();
  out.mode = mode;
  JsonObjectConst targets = cfg["targets"];
  JsonObjectConst t = targets["temperature"];
  JsonObjectConst h = targets["humidity"];
  out.targets.temperature = {!t.isNull(), t["min"] | NAN, t["max"] | NAN};
  out.targets.humidity = {!h.isNull(), h["min"] | NAN, h["max"] | NAN};
  return true;
}

// One request. Returns the HTTP status (or a negative HTTPClient error).
int postReport(const char *body, String &response) {
  if (!cloudNetLock(8000)) return -100;
  WiFiClientSecure client;
  client.setCACert(CLOUD_ROOT_CA);
  client.setTimeout(5000);
  HTTPClient http;
  http.setTimeout(5000);
  http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
  int status = -1;
  if (http.begin(client, syncUrl)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-id", CLOUD_DEVICE_ID);
    http.addHeader("x-device-key", CLOUD_DEVICE_KEY);
    status = http.POST(reinterpret_cast<uint8_t *>(const_cast<char *>(body)), strlen(body));
    if (status == 200) response = http.getString();
    http.end();
  }
  cloudNetUnlock();
  return status;
}

void syncOnce() {
  if (WiFi.status() != WL_CONNECTED || !timeValid() || ESP.getFreeHeap() < MIN_FREE_HEAP) return;
  const uint32_t nowMs = millis();

  JsonDocument doc;
  lock();
  while (pendingCount < MAX_EVENTS) {
    Event e;
    if (controller.drain(&e, 1) == 0) break;
    pending[pendingCount++] = e;
  }
  doc["bootId"] = bootId;
  doc["firmware"] = FIRMWARE;
  doc["uptimeSeconds"] = nowMs / 1000;
  if (receivedVersion > 0) doc["receivedVersion"] = receivedVersion; else doc["receivedVersion"] = nullptr;
  if (controller.appliedVersion() > 0) doc["appliedVersion"] = controller.appliedVersion(); else doc["appliedVersion"] = nullptr;
  doc["mode"] = modeText(controller.config().mode);
  JsonObject ctl = doc["controller"].to<JsonObject>();
  ctl["state"] = stateText(controller.state());
  ctl["simulated"] = true;
  ctl["sensorOk"] = controller.sensorOk();
  if (lastError[0]) doc["lastError"] = lastError; else doc["lastError"] = nullptr;
  JsonArray events = doc["events"].to<JsonArray>();
  const size_t sent = pendingCount;
  for (size_t i = 0; i < sent; ++i) addEvent(events, pending[i], nowMs);
  unlock();

  char body[3600];
  const size_t length = serializeJson(doc, body, sizeof(body));
  if (length == 0 || length >= sizeof(body) - 1) { setError("report_too_large"); return; }

  String response;
  const int status = postReport(body, response);
  Serial.printf("[CTL] sync status: %d\n", status);
  if (status != 200) return;  // events stay queued and are retried; nothing is lost on a network error

  lock();
  if (sent <= pendingCount) {  // drop only what was acknowledged
    memmove(pending, pending + sent, (pendingCount - sent) * sizeof(Event));
    pendingCount -= sent;
  }
  unlock();

  JsonDocument reply;
  if (deserializeJson(reply, response) != DeserializationError::Ok) { setError("bad_sync_response"); return; }
  JsonObjectConst cfg = reply["config"];
  if (cfg.isNull()) return;  // nothing new
  Config next;
  if (!parseConfig(cfg, next)) { setError("bad_config_shape"); return; }
  lock();
  controller.noteReceived(next.version, millis());
  receivedVersion = next.version;
  const ConfigError result = controller.apply(next, millis());
  if (result == ConfigError::None) { lastError[0] = 0; saveConfig(next); }
  else setError(configErrorText(result));
  unlock();
  Serial.printf("[CTL] config v%lu -> %s\n", static_cast<unsigned long>(next.version), configErrorText(result));
}

void syncTask(void *) {
  vTaskDelay(pdMS_TO_TICKS(SYNC_FIRST_DELAY_MS));
  for (;;) {
    syncOnce();
    vTaskDelay(pdMS_TO_TICKS(SYNC_INTERVAL_MS));
  }
}

bool deriveSyncUrl() {
  if (!CLOUD_ENABLED || strncmp(CLOUD_ENDPOINT, "https://", 8) != 0) return false;
  const char *tail = strstr(CLOUD_ENDPOINT, "/readings");
  if (!tail || tail[9] != 0) return false;
  const size_t head = static_cast<size_t>(tail - CLOUD_ENDPOINT);
  if (head + 6 >= sizeof(syncUrl)) return false;
  memcpy(syncUrl, CLOUD_ENDPOINT, head);
  strcpy(syncUrl + head, "/sync");
  return true;
}
}  // namespace

void controlBegin() {
  ctlMux = xSemaphoreCreateMutex();
  snprintf(bootId, sizeof(bootId), "%08lx", static_cast<unsigned long>(esp_random()));
  const uint32_t now = millis();
  controller.begin(now);

  // Recover the last valid config after a reboot. A stored mode this build cannot run is ignored, not "approximated".
  Config stored;
  if (loadConfig(stored)) {
    receivedVersion = stored.version;
    if (controller.apply(stored, now) != ConfigError::None) { receivedVersion = 0; setError("stored_config_invalid"); }
  }
  Serial.printf("[CTL] controller ready, config v%lu, mode %s, outputs NEVER driven in this build\n",
                static_cast<unsigned long>(controller.appliedVersion()), modeText(controller.config().mode));

  // Hardware watchdog on the main loop: a hang reboots the board, and outputs boot OFF.
#if ESP_IDF_VERSION_MAJOR >= 5
  esp_task_wdt_config_t cfg = {WATCHDOG_MS, 0, true};
  esp_task_wdt_reconfigure(&cfg);
#else
  esp_task_wdt_init(WATCHDOG_MS / 1000, true);
#endif
  esp_task_wdt_add(nullptr);

  if (deriveSyncUrl()) {
    syncStarted = xTaskCreatePinnedToCore(syncTask, "myko-sync", 10240, nullptr, 1, nullptr, 0) == pdPASS;
  }
}

void controlFeed(float temperature, float humidity) {
  if (!ctlMux || !isfinite(temperature) || !isfinite(humidity)) { controlInvalid(); return; }
  lock();
  lastTemperature = temperature;
  lastHumidity = humidity;
  lastSampleMs = millis();
  lastValid = true;
  unlock();
}

void controlInvalid() {
  if (!ctlMux) return;
  lock();
  lastValid = false;
  unlock();
}

void controlTick() {
  esp_task_wdt_reset();
  if (!ctlMux) return;
  const unsigned long now = millis();
  if (now - lastStepMs < 1000) return;
  lastStepMs = now;
  lock();
  const uint32_t age = static_cast<uint32_t>(now - lastSampleMs);
  controller.step(now, lastValid, lastTemperature, lastHumidity, age);
  unlock();
}
