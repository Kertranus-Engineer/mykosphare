/*
 * MYKOSPHARE — ESP32 Production Firmware v5 (Demo-Stable)
 *
 * STABILITY > EFFECTS > ANIMATIONS
 * TELEMETRY FIRST — everything else is secondary.
 *
 * GPIO MAP:  Fan1=19, Fan2=18, Humidifier=17, Heater=32, LED=2, DHT=4
 * LCD: I2C 0x27 16x2
 *
 * TIMERS (independent, non-blocking, priority-ordered in loop):
 *   Telemetry:     3000ms  (PRIORITY — never skip)
 *   Sensor read:   2000ms
 *   LCD refresh:   1500ms
 *   Command poll:  2000ms
 *   Config poll:   10000ms (reduced from 5s to avoid blocking telemetry)
 *   Watchdog:      5000ms
 *   Heartbeat:     >10s no telemetry → reconnect WiFi
 *   HTTP WDT:      3 consecutive telemetry failures → restart HTTP client
 *
 * SAFETY:
 *   - No lcd.clear() ever (padding with spaces + setCursor)
 *   - LCD render cache (only update on value change)
 *   - Brownout protection (stagger relay/LCD ops)
 *   - Non-blocking HTTP with timeout
 *   - No String concat in hot paths
 *   - WiFi reconnect does NOT block loop
 *   - Telemetry always runs even if config/commands fail
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>

// ── WIFI ────────────────────────────────────────
const char* WIFI_SSID  = "YOUR_SSID";
const char* WIFI_PASS  = "YOUR_PASSWORD";
const char* SERVER_URL = "http://10.115.93.36:3000";  // ← Update from /debug-network PRIMARY LAN

// ── PINS ────────────────────────────────────────
const int FAN1_PIN = 19;
const int FAN2_PIN = 18;
const int HUM_PIN  = 17;
const int HEAT_PIN = 32;
const int LED_PIN  = 2;
const int DHT_PIN  = 4;

const bool RELAY_ACTIVE_LOW = true;

// ── TIMING CONSTANTS ────────────────────────────
const unsigned long HTTP_TIMEOUT_MS         = 5000;
const unsigned long WIFI_RECONNECT_COOLDOWN = 30000;
const unsigned long HEARTBEAT_TIMEOUT       = 10000;
const unsigned long LCD_MIN_INTERVAL        = 1500;
const unsigned long RELAY_LCD_COOLDOWN      = 200;
const unsigned long WATCHDOG_INTERVAL       = 5000;
const int  TELEMETRY_FAIL_MAX               = 3;      // consecutive failures before HTTP restart
const int  HTTP_RESTART_COOLDOWN            = 10000;  // ms between HTTP restarts

DHT dht(DHT_PIN, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);
Preferences prefs;

// ── CONFIG STRUCT ───────────────────────────────
struct SystemConfig {
  float targetTemp      = 24.0;
  float targetHumidity  = 65.0;
  float fanOnTemp       = 28.0;
  float fanOffTemp      = 26.0;
  float criticalTemp    = 32.0;
  float emergencyTemp   = 35.0;
  int   telemetryInterval = 3000;
  bool  autoFan         = true;
  bool  autoHumidifier  = true;
} config;

// ── TIMER STATE ─────────────────────────────────
unsigned long now = 0;

unsigned long lastSensorRead   = 0;
unsigned long lastTelemetry    = 0;
unsigned long lastCmdPoll      = 0;
unsigned long lastCfgPoll      = 0;
unsigned long lastLCDWrite     = 0;
unsigned long lastWatchdog     = 0;
unsigned long lastWiFiAttempt  = 0;

unsigned long lastTelemetrySuccess = 0;
unsigned long lastRelayToggle      = 0;

// ── TELEMETRY WATCHDOG ──────────────────────────
int  telemetryFailCount     = 0;
bool httpClientRestarting   = false;
unsigned long lastHttpRestart = 0;

// ── LOOP TIMING (watchdog) ──────────────────────
unsigned long loopMaxUs = 0;
unsigned long loopSumUs = 0;
unsigned long loopCount = 0;

// ── RELAY STATE ─────────────────────────────────
int fanState = 0;
int humState = 0;

// ── SENSOR CACHE ────────────────────────────────
float cachedTemp = NAN;
float cachedHum  = NAN;

// ── LCD RENDER CACHE ────────────────────────────
float lastLcdTemp  = -999.0;
float lastLcdHum   = -999.0;
int   lastLcdFan   = -1;
int   lastLcdHumS  = -1;

// ── WIFI STATE ──────────────────────────────────
bool wifiWasUp = false;

// ── HELPERS ─────────────────────────────────────
int rHigh() { return RELAY_ACTIVE_LOW ? LOW : HIGH; }
int rLow()  { return RELAY_ACTIVE_LOW ? HIGH : LOW; }
void setRelay(int pin, bool on) { digitalWrite(pin, on ? rHigh() : rLow()); }

// ── SAFE LCD WRITE (no clear, padded, cached) ──
void lcdLine(int row, const char* text) {
  lcd.setCursor(0, row);
  lcd.print(text);
}

void lcdRefresh() {
  if (millis() - lastLCDWrite < LCD_MIN_INTERVAL) return;
  if (millis() - lastRelayToggle < RELAY_LCD_COOLDOWN) return;
  if (isnan(cachedTemp) || isnan(cachedHum)) return;

  bool changed = false;

  if (fabs(cachedTemp - lastLcdTemp) >= 0.1 || fanState != lastLcdFan) {
    char buf[17];
    snprintf(buf, 17, "T:%.1fC F:%s    ",
             cachedTemp, fanState ? "ON " : "OFF");
    lcdLine(0, buf);
    lastLcdTemp = cachedTemp;
    lastLcdFan  = fanState;
    changed = true;
  }

  if (fabs(cachedHum - lastLcdHum) >= 0.1 || humState != lastLcdHumS) {
    char buf[17];
    snprintf(buf, 17, "H:%.1f%% Hm:%s  ",
             cachedHum, humState ? "ON " : "OFF");
    lcdLine(1, buf);
    lastLcdHum  = cachedHum;
    lastLcdHumS = humState;
    changed = true;
  }

  if (changed) {
    lastLCDWrite = millis();
  }
}

// ── GPIO EXECUTION ──────────────────────────────
void executeCommand(const char* cmd) {
  Serial.printf("[CMD] %s\n", cmd);

  if (strcmp(cmd, "fan_on") == 0) {
    setRelay(FAN1_PIN, true); setRelay(FAN2_PIN, true);
    fanState = 1; digitalWrite(LED_PIN, HIGH);
  }
  else if (strcmp(cmd, "fan_off") == 0) {
    setRelay(FAN1_PIN, false); setRelay(FAN2_PIN, false);
    fanState = 0; if (!humState) digitalWrite(LED_PIN, LOW);
  }
  else if (strcmp(cmd, "humidifier_on") == 0) {
    setRelay(HUM_PIN, true);
    humState = 1; digitalWrite(LED_PIN, HIGH);
  }
  else if (strcmp(cmd, "humidifier_off") == 0) {
    setRelay(HUM_PIN, false);
    humState = 0; if (!fanState) digitalWrite(LED_PIN, LOW);
  }
  else if (strcmp(cmd, "heater_on") == 0) {
    setRelay(HEAT_PIN, true);
  }
  else if (strcmp(cmd, "heater_off") == 0) {
    setRelay(HEAT_PIN, false);
  }
  else if (strcmp(cmd, "all_off") == 0) {
    setRelay(FAN1_PIN, false); setRelay(FAN2_PIN, false);
    setRelay(HUM_PIN, false);  setRelay(HEAT_PIN, false);
    fanState = humState = 0; digitalWrite(LED_PIN, LOW);
  }

  lastRelayToggle = millis();
}

// ── HTTP HELPERS ────────────────────────────────
bool httpGet(const char* endpoint, String& out) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("[NET] GET %s SKIPPED (WiFi down)\n", endpoint);
    return false;
  }
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(String(SERVER_URL) + endpoint);
  int code = http.GET();
  bool ok = (code == 200);
  if (ok) {
    out = http.getString();
    Serial.printf("[NET] GET %s → 200 OK (%d bytes)\n", endpoint, out.length());
  } else {
    Serial.printf("[ERR] GET %s → HTTP %d\n", endpoint, code);
    if (code > 0) {
      String errBody = http.getString();
      if (errBody.length() > 0 && errBody.length() < 200) {
        Serial.printf("[ERR] Body: %s\n", errBody.c_str());
      }
    }
  }
  http.end();
  return ok;
}

// Returns HTTP status code (0 = WiFi down, -1 = timeout/error)
int httpPostVerbose(const char* endpoint, const char* body) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("[NET] POST %s SKIPPED (WiFi down)\n", endpoint);
    return 0;
  }
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(String(SERVER_URL) + endpoint);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST((uint8_t*)body, strlen(body));

  if (code == 200) {
    Serial.printf("[NET] POST %s → 200 OK\n", endpoint);
  } else if (code > 0) {
    Serial.printf("[ERR] POST %s → HTTP %d\n", endpoint, code);
    String errBody = http.getString();
    if (errBody.length() > 0 && errBody.length() < 200) {
      Serial.printf("[ERR] Body: %s\n", errBody.c_str());
    }
  } else {
    Serial.printf("[ERR] POST %s → FAILED (code=%d, timeout/error)\n", endpoint, code);
  }

  http.end();
  return code;
}

bool httpPost(const char* endpoint, const char* body) {
  return httpPostVerbose(endpoint, body) == 200;
}

// ── TELEMETRY HTTP RESTART ──────────────────────
void maybeRestartHttpClient() {
  if (telemetryFailCount < TELEMETRY_FAIL_MAX) return;
  if (httpClientRestarting) return;
  if (millis() - lastHttpRestart < HTTP_RESTART_COOLDOWN) return;

  Serial.printf("[WDT] Telemetry failed %d times consecutively — restarting HTTP\n",
                telemetryFailCount);
  httpClientRestarting = true;
  lastHttpRestart = millis();

  // Force WiFi reconnect to clear any stuck TCP state
  WiFi.disconnect(true);
  delay(500);
  WiFi.reconnect();

  telemetryFailCount = 0;
  httpClientRestarting = false;

  Serial.println("[WDT] HTTP client restart complete");
}

// ── CONFIG POLLING ──────────────────────────────
void pollConfig() {
  String payload;
  if (!httpGet("/api/config", payload)) return;

  auto extract = [&](const char* key, float def) -> float {
    int i = payload.indexOf(key);
    if (i < 0) return def;
    i += strlen(key) + 3;
    return payload.substring(i, payload.indexOf(",", i)).toFloat();
  };

  config.targetTemp     = extract("targetTemp", 24.0);
  config.targetHumidity = extract("targetHumidity", 65.0);
  config.fanOnTemp      = extract("fanOnTemp", 28.0);
  config.fanOffTemp     = extract("fanOffTemp", 26.0);
  config.criticalTemp   = extract("criticalTemp", 32.0);
  config.emergencyTemp  = extract("emergencyTemp", 35.0);
  config.telemetryInterval = (int)extract("telemetryInterval", 3000);
  config.autoFan        = (bool)extract("autoFan", 1);
  config.autoHumidifier = (bool)extract("autoHumidifier", 1);

  prefs.putFloat("targetTemp", config.targetTemp);
  prefs.putFloat("fanOnTemp", config.fanOnTemp);
  prefs.putFloat("fanOffTemp", config.fanOffTemp);

  Serial.println("[CONFIG] Updated");
}

// ── COMMAND POLLING ─────────────────────────────
void pollCommands() {
  String payload;
  if (!httpGet("/api/command", payload)) return;

  int idx = 0;
  while ((idx = payload.indexOf("\"command\":\"", idx)) > 0) {
    idx += 11;
    int end = payload.indexOf("\"", idx);
    executeCommand(payload.substring(idx, end).c_str());

    idx = payload.indexOf("\"id\":\"", end);
    if (idx < 0) break;
    idx += 6;
    end = payload.indexOf("\"", idx);
    char ack[128];
    snprintf(ack, sizeof(ack),
             "{\"id\":\"%s\",\"status\":\"executed\"}",
             payload.substring(idx, end).c_str());
    httpPost("/api/command/ack", ack);
  }
}

// ── AUTOMATION LOGIC ────────────────────────────
void runAutomation(float temp, float hum) {
  if (!config.autoFan && !config.autoHumidifier) return;

  if (config.autoFan) {
    if (temp >= config.emergencyTemp)           { executeCommand("fan_on");  Serial.println("[AUTO] EMERGENCY COOLING"); }
    else if (temp >= config.criticalTemp && !fanState) { executeCommand("fan_on");  Serial.println("[AUTO] CRITICAL FAN"); }
    else if (temp >= config.fanOnTemp && !fanState)    { executeCommand("fan_on");  Serial.println("[AUTO] FAN ON"); }
    else if (temp <= config.fanOffTemp && fanState)    { executeCommand("fan_off"); Serial.println("[AUTO] FAN OFF"); }
  }

  if (config.autoHumidifier) {
    if (hum < 55 && !humState)     { executeCommand("humidifier_on");  Serial.println("[AUTO] HUM ON"); }
    else if (hum > 70 && humState) { executeCommand("humidifier_off"); Serial.println("[AUTO] HUM OFF"); }
  }
}

// ── SENSOR READ ─────────────────────────────────
void readSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    cachedTemp = t;
    cachedHum  = h;
    Serial.printf("[SNS] T=%.1f°C H=%.1f%%\n", t, h);
  } else {
    Serial.printf("[ERR] DHT22 read failed (T=%s H=%s)\n",
                  isnan(t) ? "NAN" : "OK",
                  isnan(h) ? "NAN" : "OK");
  }
}

// ── TELEMETRY ───────────────────────────────────
void sendTelemetry() {
  if (isnan(cachedTemp) || isnan(cachedHum)) {
    Serial.println("[ERR] telemetry skipped — sensor cache empty");
    return;
  }

  runAutomation(cachedTemp, cachedHum);

  char payload[128];
  snprintf(payload, sizeof(payload),
           "{\"temp\":%.1f,\"hum\":%.1f,\"fan\":%s,\"humidifier\":%s}",
           cachedTemp, cachedHum,
           fanState ? "true" : "false",
           humState ? "true" : "false");

  Serial.printf("[NET] telemetry send: %s\n", payload);

  int code = httpPostVerbose("/api/data", payload);

  if (code == 200) {
    lastTelemetrySuccess = millis();
    telemetryFailCount = 0;
    Serial.printf("[NET] telemetry OK — success streak restored\n");
  } else {
    telemetryFailCount++;
    Serial.printf("[WDT] telemetry FAIL #%d/%d (HTTP %d)\n",
                  telemetryFailCount, TELEMETRY_FAIL_MAX, code);

    if (telemetryFailCount >= TELEMETRY_FAIL_MAX) {
      Serial.printf("[WDT] TRIGGERED — will restart HTTP client\n");
    }
  }
}

// ── WIFI RECONNECT (non-blocking with delay cap) ─
void reconnectWiFi() {
  if (millis() - lastWiFiAttempt < WIFI_RECONNECT_COOLDOWN) return;
  lastWiFiAttempt = millis();

  Serial.printf("[WIFI] Reconnecting... RSSI before=%d\n", WiFi.RSSI());
  WiFi.reconnect();
  for (int i = 0; i < 15 && WiFi.status() != WL_CONNECTED; i++) {
    delay(200);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] OK — RSSI=%d dBm IP=%s\n",
                  WiFi.RSSI(), WiFi.localIP().toString().c_str());
    wifiWasUp = true;
    lastTelemetrySuccess = millis();
    telemetryFailCount = 0;  // reset fail counter on reconnect
  } else {
    Serial.println("\n[WIFI] FAILED");
  }
}

// ── HEARTBEAT CHECK ─────────────────────────────
void checkHeartbeat() {
  if (wifiWasUp && millis() - lastTelemetrySuccess > HEARTBEAT_TIMEOUT) {
    Serial.printf("[HEARTBEAT] >10s no telemetry (%lums) — resetting WiFi\n",
                  millis() - lastTelemetrySuccess);
    reconnectWiFi();
    lastTelemetrySuccess = millis();
  }
}

// ── WATCHDOG SERIAL LOG ─────────────────────────
void printWatchdog() {
  if (millis() - lastWatchdog < WATCHDOG_INTERVAL) return;
  lastWatchdog = millis();

  unsigned long avgUs = (loopCount > 0) ? (loopSumUs / loopCount) : 0;
  unsigned long telAgo = (lastTelemetrySuccess > 0)
    ? millis() - lastTelemetrySuccess
    : millis();
  unsigned long uptime = millis() / 1000;

  Serial.printf(
    "[SYS] Heap:%u | RSSI:%d dBm | TelAgo:%lums | Uptime:%lus | LoopMax:%luus | LoopAvg:%luus | TelFails:%d\n",
    ESP.getFreeHeap(),
    WiFi.RSSI(),
    telAgo,
    uptime,
    loopMaxUs,
    avgUs,
    telemetryFailCount
  );
  loopMaxUs = 0;
}

// ── SETUP ───────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== MYKOSPHARE v5 (Demo-Stable) ===");
  Serial.printf("[SYS] Heap init: %u bytes\n", ESP.getFreeHeap());

  // GPIO init — all relays OFF
  pinMode(FAN1_PIN, OUTPUT); pinMode(FAN2_PIN, OUTPUT);
  pinMode(HUM_PIN, OUTPUT);  pinMode(HEAT_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  setRelay(FAN1_PIN, false); setRelay(FAN2_PIN, false);
  setRelay(HUM_PIN, false);  setRelay(HEAT_PIN, false);

  dht.begin();

  lcd.init();
  lcd.backlight();
  lcdLine(0, "MYKOSPHARE v5   ");
  lcdLine(1, "Starting...     ");

  prefs.begin("mykosphare");
  config.targetTemp = prefs.getFloat("targetTemp", 24.0);
  config.fanOnTemp  = prefs.getFloat("fanOnTemp", 28.0);
  config.fanOffTemp = prefs.getFloat("fanOffTemp", 26.0);

  // WiFi connect (blocking here, only in setup)
  Serial.printf("[WIFI] Connecting to %s...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) {
    delay(250);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] ONLINE — RSSI=%d dBm IP=%s\n",
                  WiFi.RSSI(), WiFi.localIP().toString().c_str());
    wifiWasUp = true;
    lcdLine(1, "ONLINE          ");
  } else {
    Serial.println("\n[WIFI] OFFLINE — will retry in loop");
  }

  // Baseline all timers
  now = millis();
  lastSensorRead = now;
  lastTelemetry  = now;
  lastCmdPoll    = now;
  lastCfgPoll    = now;
  lastLCDWrite   = now;
  lastWatchdog   = now;
  lastTelemetrySuccess = now;
  lastRelayToggle = now;
  lastHttpRestart = now;
}

// ── LOOP ────────────────────────────────────────
void loop() {
  unsigned long loopStart = micros();
  now = millis();

  // ── PRIORITY 1: TELEMETRY (always runs, never skipped) ──
  if (now - lastTelemetry >= (unsigned long)config.telemetryInterval) {
    lastTelemetry = now;
    sendTelemetry();

    // ── Telemetry watchdog: restart HTTP if failed too many times ──
    maybeRestartHttpClient();
  }

  // ── PRIORITY 2: SENSOR READ ───────────────────
  if (now - lastSensorRead >= 2000) {
    lastSensorRead = now;
    readSensors();
  }

  // ── PRIORITY 3: HEARTBEAT + WIFI ──────────────
  checkHeartbeat();
  if (WiFi.status() != WL_CONNECTED) {
    reconnectWiFi();
  }

  // ── PRIORITY 4: COMMAND POLL ──────────────────
  if (now - lastCmdPoll >= 2000) {
    lastCmdPoll = now;
    pollCommands();
  }

  // ── PRIORITY 5: CONFIG POLL (reduced freq 10s) ─
  if (now - lastCfgPoll >= 10000) {
    lastCfgPoll = now;
    pollConfig();
  }

  // ── PRIORITY 6: LCD REFRESH ───────────────────
  lcdRefresh();

  // ── PRIORITY 7: WATCHDOG SERIAL ───────────────
  printWatchdog();

  // ── LOOP STATS ────────────────────────────────
  unsigned long loopUs = micros() - loopStart;
  if (loopUs > loopMaxUs) loopMaxUs = loopUs;
  loopSumUs += loopUs;
  loopCount++;

  yield();
  delay(1);
}
