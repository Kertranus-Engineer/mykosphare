#include "CloudTransport.h"
#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <sys/time.h>
#include <time.h>

#if __has_include("CloudConfig.local.h")
#include "CloudConfig.local.h"
#else
#include "CloudConfig.example.h"
#endif

namespace {
struct Sample {
  bool valid;
  float temperature;
  float humidity;
  unsigned long sampledMillis;
  int64_t sampledEpochMs;
};

portMUX_TYPE sampleMux = portMUX_INITIALIZER_UNLOCKED;
Sample latest = {false, 0, 0, 0, 0};
uint32_t generation = 0;
uint32_t sentGeneration = 0;
bool cloudStarted = false;

constexpr unsigned long SEND_INTERVAL_MS = 30000;
constexpr unsigned long MAX_SAMPLE_AGE_MS = 10000;
constexpr unsigned long WIFI_RETRY_MS = 10000;

bool configured() {
  return CLOUD_ENABLED && strlen(CLOUD_WIFI_SSID) > 0 &&
    strlen(CLOUD_DEVICE_ID) > 0 && strlen(CLOUD_DEVICE_KEY) > 0 &&
    strncmp(CLOUD_ENDPOINT, "https://", 8) == 0 &&
    strstr(CLOUD_ENDPOINT, "REPLACE_WITH_PREVIEW_HOST") == nullptr &&
    strstr(CLOUD_ROOT_CA, "REPLACE_WITH_VALID_ROOT_CA") == nullptr;
}

bool capture(Sample &sample, uint32_t &version) {
  portENTER_CRITICAL(&sampleMux);
  sample = latest;
  version = generation;
  portEXIT_CRITICAL(&sampleMux);
  return sample.valid && version != sentGeneration &&
    millis() - sample.sampledMillis <= MAX_SAMPLE_AGE_MS &&
    sample.sampledEpochMs >= 1760000000000LL;
}

void markAttempted(uint32_t version) {
  // A failed sample is deliberately dropped. The next valid DHT read is fresh.
  sentGeneration = version;
}

void cloudTask(void *) {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(CLOUD_WIFI_SSID, CLOUD_WIFI_PASSWORD);
  configTime(0, 0, "pool.ntp.org", "time.google.com");

  unsigned long nextWifiAttempt = millis() + WIFI_RETRY_MS;
  unsigned long nextSend = millis();
  bool rejected = false;
  for (;;) {
    const unsigned long tick = millis();
    if (WiFi.status() != WL_CONNECTED) {
      if (static_cast<int32_t>(tick - nextWifiAttempt) >= 0) {
        WiFi.reconnect();
        nextWifiAttempt = tick + WIFI_RETRY_MS;
      }
      vTaskDelay(pdMS_TO_TICKS(250));
      continue;
    }
    if (rejected || static_cast<int32_t>(tick - nextSend) < 0) {
      vTaskDelay(pdMS_TO_TICKS(250));
      continue;
    }

    Sample sample;
    uint32_t version;
    if (!capture(sample, version)) {
      vTaskDelay(pdMS_TO_TICKS(250));
      continue;
    }
    markAttempted(version);
    nextSend = tick + SEND_INTERVAL_MS;
    char observedAt[32];
    const time_t seconds = sample.sampledEpochMs / 1000;
    struct tm utc;
    if (gmtime_r(&seconds, &utc) == nullptr ||
        strftime(observedAt, sizeof(observedAt), "%Y-%m-%dT%H:%M:%S", &utc) == 0) continue;
    const unsigned milliseconds = static_cast<unsigned>(sample.sampledEpochMs % 1000);
    char timestamp[40];
    snprintf(timestamp, sizeof(timestamp), "%s.%03uZ", observedAt, milliseconds);
    char body[160];
    snprintf(body, sizeof(body), "{\"observedAt\":\"%s\",\"temperature\":%.2f,\"humidity\":%.2f}",
             timestamp, sample.temperature, sample.humidity);

    WiFiClientSecure client;
    client.setCACert(CLOUD_ROOT_CA);
    client.setTimeout(4000);
    HTTPClient http;
    http.setTimeout(4000);
    http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
    if (!http.begin(client, CLOUD_ENDPOINT)) continue;
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-id", CLOUD_DEVICE_ID);
    http.addHeader("x-device-key", CLOUD_DEVICE_KEY);
    const int status = http.POST(reinterpret_cast<uint8_t *>(body), strlen(body));
    http.end();
    // Status alone allows USB verification without exposing the request.
    Serial.printf("[CLOUD] HTTPS status: %d\n", status);
    if (status == 401 || status == 403) rejected = true;
    if (status == 429) nextSend = millis() + 60000;
    if (status < 0 || status >= 500) nextSend = millis() + 60000;
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}
}  // namespace

void cloudBegin() {
  if (!configured()) return;
  // Network runs on its own core. Sensor, LCD, and actuator loop never waits
  // for Wi-Fi, NTP, TLS, or HTTP.
  cloudStarted = xTaskCreatePinnedToCore(cloudTask, "myko-cloud", 8192, nullptr, 1, nullptr, 0) == pdPASS;
}

void cloudPublishSample(float temperature, float humidity) {
  if (!cloudStarted || !isfinite(temperature) || !isfinite(humidity)) return;
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  portENTER_CRITICAL(&sampleMux);
  latest = {true, temperature, humidity, millis(),
            static_cast<int64_t>(tv.tv_sec) * 1000 + tv.tv_usec / 1000};
  ++generation;
  portEXIT_CRITICAL(&sampleMux);
}

void cloudInvalidateSample() {
  if (!cloudStarted) return;
  portENTER_CRITICAL(&sampleMux);
  latest.valid = false;
  ++generation;
  portEXIT_CRITICAL(&sampleMux);
}
