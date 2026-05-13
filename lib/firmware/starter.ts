export const ARDUINO_SKETCH = `/*
 * MYKOSPHARE — ESP32 Telemetry Bridge
 * Minimal starter firmware
 *
 * Prerequisites:
 * - Arduino IDE with ESP32 board support
 * - Libraries: WiFi.h, HTTPClient.h, ArduinoJson.h
 *
 * Configuration:
 * - Set WIFI_SSID, WIFI_PASSWORD
 * - Set INGESTION_HOST, INGESTION_KEY
 * - Set DEPLOYMENT_ID
 *
 * This firmware:
 * 1. Connects to WiFi
 * 2. Sends telemetry every 2.5s
 * 3. Sends heartbeat every 60s
 * 4. Retries on failure with backoff
 * 5. Buffers telemetry when offline (placeholder)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== CONFIGURATION =====
const char* WIFI_SSID = "MykosNetwork";
const char* WIFI_PASSWORD = "secure_password";
const char* INGESTION_HOST = "mykosphare.example.com";
const char* INGESTION_KEY = "myk-dev-secret";
const char* DEPLOYMENT_ID = "MYK-CH-001";
const char* DEVICE_ID = "SHT31-01";
const char* DEVICE_TYPE = "SHT31";

const int TELEMETRY_INTERVAL_MS = 2500;
const int HEARTBEAT_INTERVAL_MS = 60000;
const int MAX_RETRIES = 3;
const int HTTP_TIMEOUT_MS = 5000;

// ===== STATE =====
unsigned long lastTelemetryMs = 0;
unsigned long lastHeartbeatMs = 0;
unsigned long uptimeSeconds = 0;
int retryCount = 0;

// ===== WIFI =====
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" CONNECTED");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" FAILED");
  }
}

// ===== HTTP POST =====
bool postJSON(const char* endpoint, const char* json) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  HTTPClient http;
  String url = String("https://") + INGESTION_HOST + endpoint;

  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-ingestion-key", INGESTION_KEY);

  int httpCode = http.POST((uint8_t*)json, strlen(json));

  if (httpCode > 0) {
    String response = http.getString();
    http.end();

    if (httpCode == 200) {
      return true;
    }
    if (httpCode == 429) {
      delay(1000);
      return false;
    }
    return false;
  }

  http.end();
  return false;
}

// ===== RETRY WRAPPER =====
bool postWithRetry(const char* endpoint, const char* json) {
  for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (postJSON(endpoint, json)) {
      retryCount = 0;
      return true;
    }

    if (attempt < MAX_RETRIES - 1) {
      int delayMs = (1 << attempt) * 1000;
      delay(delayMs);
    }
  }

  retryCount++;
  return false;
}

// ===== BUILD PAYLOADS =====
void buildTelemetryJSON(StaticJsonDocument<512>& doc,
                        float temp, float hum, float co2, float energy) {
  doc["version"] = 1;
  doc["source"] = "esp32";
  doc["timestamp"] = "2026-05-13T12:00:00.000Z";
  doc["deviceId"] = DEVICE_ID;
  doc["deploymentId"] = DEPLOYMENT_ID;

  JsonObject metrics = doc.createNestedObject("metrics");
  metrics["temperature"] = temp;
  metrics["humidity"] = hum;
  metrics["co2"] = co2;
  metrics["energyUsage"] = energy;

  doc["environmentalState"] = "STABLE";
  doc["operationalMode"] = "OPERATIONAL";
}

void buildHeartbeatJSON(StaticJsonDocument<256>& doc) {
  doc["version"] = 1;
  doc["source"] = "esp32";
  doc["timestamp"] = "2026-05-13T12:00:00.000Z";
  doc["deviceId"] = DEVICE_ID;
  doc["deviceType"] = DEVICE_TYPE;
  doc["status"] = "online";
  doc["health"] = 99.5;
  doc["uptime"] = uptimeSeconds;
  doc["deploymentId"] = DEPLOYMENT_ID;
}

// ===== MAIN =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\nMYKOSPHARE ESP32 Bridge v1.0.0");
  connectWiFi();
}

void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(5000);
    return;
  }

  // Telemetry every 2.5s
  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = now;
    uptimeSeconds += TELEMETRY_INTERVAL_MS / 1000;

    float temp = 24.6 + (random(-50, 50) / 100.0);
    float hum = 61.2 + (random(-25, 25) / 100.0);
    float co2 = 412 + random(-15, 15);
    float energy = 1.8 + (random(-4, 4) / 100.0);

    StaticJsonDocument<512> doc;
    buildTelemetryJSON(doc, temp, hum, co2, energy);

    char buffer[512];
    serializeJson(doc, buffer);
    postWithRetry("/api/ingest/telemetry", buffer);
  }

  // Heartbeat every 60s
  if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = now;

    StaticJsonDocument<256> doc;
    buildHeartbeatJSON(doc);

    char buffer[256];
    serializeJson(doc, buffer);
    postWithRetry("/api/ingest/device-heartbeat", buffer);
  }

  delay(10);
}
`

export const ARDUINO_PSEUDOCODE = `// ===== ENDPOINT STRUCTURE =====
// POST https://<host>/api/ingest/telemetry
// POST https://<host>/api/ingest/device-heartbeat
// POST https://<host>/api/ingest/environmental-event
//
// Headers: Content-Type: application/json
//          x-ingestion-key: <your_key>
//
// ===== PAYLOAD STRUCTURE =====
// Telemetry: { version, source, timestamp, deviceId,
//              deploymentId, metrics: { temperature, humidity, co2, energyUsage },
//              environmentalState, operationalMode }
//
// Heartbeat: { version, source, timestamp, deviceId, deviceType,
//              status, health, uptime, deploymentId }
//
// ===== RETRY LOOP =====
// for attempt = 0; attempt < MAX_RETRIES; attempt++:
//     response = HTTP_POST(endpoint, payload, headers)
//     if response.status == 200: break
//     if response.status == 429: wait Retry-After seconds
//     if attempt < MAX_RETRIES - 1:
//         delay = min(1000 * 2^attempt, 30000)  // exponential backoff
//         delay += jitter(delay * 0.3)           // ±30% jitter
//         sleep(delay)
//
// ===== OFFLINE BUFFERING =====
// buffer = []  // max 500 entries
// on telemetry send failure:
//     buffer.append(payload)
//     if buffer.size > 500: buffer.shift()  // FIFO
// on WiFi reconnect:
//     flush_interval = 100ms  // flood protection
//     for payload in buffer:
//         HTTP_POST(endpoint, payload)
//         delay(flush_interval)`

export function getStarterCode(): string {
  return ARDUINO_SKETCH
}

export function getPseudocode(): string {
  return ARDUINO_PSEUDOCODE
}
