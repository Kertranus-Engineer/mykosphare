export const FIRMWARE = {
  WIFI: {
    CONNECTION_TIMEOUT_MS: 10_000,
    CONNECTION_TIMEOUT_DESC: "Max time to wait for WiFi connection before retry",
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_ATTEMPTS_DESC: "WiFi reconnect attempts before deep sleep fallback",
    KEEP_ALIVE_SEC: 30,
    KEEP_ALIVE_DESC: "WiFi keep-alive ping interval",
  },
  TELEMETRY: {
    ENDPOINT: "/api/ingest/telemetry",
    ENDPOINT_DESC: "POST endpoint for submitting sensor telemetry",
    CONTENT_TYPE: "application/json",
    CONTENT_TYPE_DESC: "Content-Type header for all ingestion requests",
    MAX_PAYLOAD_SIZE_BYTES: 1024,
    MAX_PAYLOAD_SIZE_DESC: "Maximum telemetry payload size (bytes)",
  },
  HEARTBEAT: {
    ENDPOINT: "/api/ingest/device-heartbeat",
    ENDPOINT_DESC: "POST endpoint for device heartbeat registration",
    SEND_ON_STARTUP: true,
    SEND_ON_STARTUP_DESC: "Send heartbeat immediately on boot to register device",
  },
  HTTP: {
    TIMEOUT_MS: 5000,
    TIMEOUT_DESC: "HTTP request timeout per attempt",
    KEEP_ALIVE: true,
    KEEP_ALIVE_DESC: "Reuse HTTP connection when possible",
  },
  OFFLINE: {
    BUFFER_FILENAME: "/spiffs/telemetry_buffer.json",
    BUFFER_FILENAME_DESC: "SPIFFS file path for offline telemetry buffer",
    FLUSH_ON_RECONNECT: true,
    FLUSH_ON_RECONNECT_DESC: "Send buffered telemetry immediately after reconnect",
  },
} as const

export const WIFI_CONNECTION_STEPS = [
  "Configure WiFi SSID and password in firmware config",
  "Call WiFi.begin(ssid, password)",
  "Wait up to 10s for WL_CONNECTED status",
  "On success: proceed to telemetry loop",
  "On failure: increment retry counter, delay with backoff, retry",
  "After 5 failures: enter deep sleep for 30s before retrying",
] as const

export const TELEMETRY_POST_STEPS = [
  "Read sensor values (temperature, humidity, CO₂, energy)",
  "Build JSON payload with protocol-defined schema",
  "Set HTTP headers: Content-Type: application/json, x-ingestion-key: <key>",
  "POST payload to https://<host>/api/ingest/telemetry",
  "Parse response JSON for accepted: true/false",
  "On HTTP 200 with accepted:true → log success, continue loop",
  "On HTTP 429 (rate limited) → wait Retry-After seconds, retry",
  "On HTTP 4xx (bad request) → log error, do not retry (fix payload)",
  "On network error → buffer payload, attempt retry with backoff",
] as const

export const HEARTBEAT_POST_STEPS = [
  "Build heartbeat payload with device_id, device_type, status, health, uptime",
  "POST to https://<host>/api/ingest/device-heartbeat",
  "On success → update last heartbeat timestamp",
  "On failure → retry with exponential backoff (separate from telemetry retry)",
] as const

export const RETRY_BEHAVIOR_STEPS = [
  "Attempt 1: immediate send",
  "Attempt 2: wait 1s + jitter, retry",
  "Attempt 3: wait 2s + jitter, retry",
  "Attempt 4: wait 4s + jitter, retry (max)",
  "After max retries: buffer payload to SPIFFS, return to main loop",
  "Buffered payloads are flushed when connectivity is restored",
] as const

export const RECONNECT_BEHAVIOR_STEPS = [
  "Detect connection loss (WiFi.status() != WL_CONNECTED)",
  "Enter offline mode: buffer all telemetry to SPIFFS",
  "Attempt WiFi reconnection every 5s (exponential backoff to 2min max)",
  "On reconnect success: flush buffered payloads (FIFO order)",
  "Flood protection: limit to 25 packets in first 10s after reconnect",
  "Return to normal telemetry cadence",
] as const

export const DEVICE_CONFIG_EXAMPLE = {
  wifi: {
    ssid: "\"MykosNetwork\"",
    password: "\"secure_password\"",
  },
  ingestion: {
    host: "\"mykosphare.example.com\"",
    port: 443,
    key: "\"myk-dev-secret\"",
    deploymentId: "\"MYK-CH-001\"",
  },
  telemetry: {
    intervalMs: 2500,
    sensors: ["SHT31", "MH-Z19B", "SCT-013"],
  },
} as const
