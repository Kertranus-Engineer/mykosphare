/*
 * ESP32_NETWORK_TEST.ino — MINIMAL NETWORK ISOLATION TEST
 * 
 * PURPOSE: Prove ESP32 HTTP reaches Next.js server.
 * Zero dependencies except WiFi and HTTPClient.
 * NO DHT, NO LCD, NO Preferences, NO automation.
 * 
 * USAGE:
 *   1. Set WIFI_SSID / WIFI_PASS below
 *   2. Open http://10.115.93.36:3000/debug-network in browser
 *   3. Upload this sketch to ESP32
 *   4. Open Serial Monitor (115200 baud)
 *   5. Watch for [HTTP] code=200
 *   6. Check /debug-network: PACKET RECEIVED badge should light up
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ─── CONFIGURE THESE ──────────────────────────
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// Copy from http://10.115.93.36:3000/debug-network → "PRIMARY LAN" section
const char* SERVER_HOST = "10.115.93.36";
const int   SERVER_PORT = 3000;
const char* SERVER_PATH = "/api/raw";
// ──────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("");
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║  ESP32 MINIMAL NETWORK TEST         ║");
  Serial.println("║  NO DHT — NO LCD — NO CONFIG        ║");
  Serial.println("╚══════════════════════════════════════╝");
  Serial.println("");

  // ── WiFi ──────────────────────────────────
  Serial.print("[WiFi] SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  Serial.println("");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] FAILED to connect");
    Serial.print("[WiFi] SSID: ");
    Serial.println(WIFI_SSID);
    return;
  }

  Serial.println("[WiFi] CONNECTED");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("[WiFi] RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  // ── Build URL ─────────────────────────────
  String serverURL = String("http://") + SERVER_HOST + ":" + SERVER_PORT + SERVER_PATH;
  Serial.print("[URL] ");
  Serial.println(serverURL);

  // ── Payload ───────────────────────────────
  String payload = "{\"temp\":24.5,\"hum\":61.2}";
  Serial.print("[JSON] ");
  Serial.println(payload);

  // ── WiFi status guard ─────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERR] WiFi disconnected before POST");
    return;
  }

  // ── HTTP POST ─────────────────────────────
  HTTPClient http;

  Serial.println("[HTTP] begin");
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  Serial.println("[HTTP] sending");
  int httpCode = http.POST(payload);

  Serial.print("[HTTP] code=");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("[HTTP] response=");
    Serial.println(response);
    Serial.println("");
    Serial.println("══════════════════════════════════════");
    Serial.println("  NETWORK TEST PASSED");
    Serial.println("  Check /debug-network for PACKET");
    Serial.println("══════════════════════════════════════");
  } else {
    Serial.print("[HTTP] error=");
    Serial.println(http.errorToString(httpCode));
    Serial.println("");

    Serial.println("╔══════════════════════════════════════╗");
    Serial.println("║         DIAGNOSIS                    ║");
    Serial.println("╚══════════════════════════════════════╝");
    Serial.println("");

    if (httpCode < 0) {
      Serial.print("[ERR] HTTP code=");
      Serial.print(httpCode);
      Serial.print(" → ");
      Serial.println(http.errorToString(httpCode));
    }

    Serial.print("[CHECK] WiFi status: ");
    Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");

    Serial.print("[CHECK] ESP32 IP: ");
    Serial.println(WiFi.localIP());

    Serial.print("[CHECK] Can phone reach ");
    Serial.print(serverURL);
    Serial.println(" ?");

    Serial.println("");
    Serial.println("  Likely causes:");
    Serial.println("  1. Server IP changed → check /debug-network PRIMARY LAN");
    Serial.println("  2. WiFi router AP Isolation enabled");
    Serial.println("  3. ESP32 on 5GHz band (ESP32 = 2.4GHz only)");
    Serial.println("  4. Antivirus blocking local connections");
    Serial.println("  5. Wrong subnet (phone + ESP32 = same WiFi?)");
  }

  http.end();

  Serial.println("");
  Serial.println("[TEST] Complete");
  Serial.print("[TEST] Re-check: ");
  Serial.println(serverURL + " /debug-network");
}

void loop() {
  delay(10000);
}
