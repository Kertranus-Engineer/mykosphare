export const ESP32_TELEMETRY_EXAMPLE = `{
  "version": 1,
  "source": "esp32",
  "timestamp": "2026-05-13T12:00:00.000Z",
  "deviceId": "SHT31-01",
  "deploymentId": "MYK-CH-001",
  "metrics": {
    "temperature": 24.6,
    "humidity": 61.2,
    "co2": 412,
    "energyUsage": 1.8
  },
  "environmentalState": "STABLE",
  "operationalMode": "OPERATIONAL"
}`

export const ESP32_HEARTBEAT_EXAMPLE = `{
  "version": 1,
  "source": "esp32",
  "timestamp": "2026-05-13T12:00:00.000Z",
  "deviceId": "MH-Z19B-02",
  "deviceType": "MH-Z19B",
  "status": "online",
  "health": 97.2,
  "uptime": 84600,
  "deploymentId": "MYK-CH-001"
}`

export const ESP32_EVENT_EXAMPLE = `{
  "version": 1,
  "source": "esp32",
  "timestamp": "2026-05-13T12:00:00.000Z",
  "type": "state_change",
  "deploymentId": "MYK-CH-001",
  "currentState": "WARNING",
  "severity": "warning",
  "description": "CO\u2082 exceeded threshold of 420 ppm"
}`

export const ESP32_SUCCESS_RESPONSE = `HTTP/1.1 200 OK
Content-Type: application/json

{
  "accepted": true,
  "eventType": "telemetry_accepted",
  "normalized": false,
  "timestamp": "2026-05-13T12:00:00.050Z"
}`

export const ESP32_ERROR_RESPONSE = `HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "accepted": false,
  "eventType": "malformed_payload_rejected",
  "reason": "stale timestamp ignored",
  "timestamp": "2026-05-13T12:00:00.050Z"
}`

export const ESP32_RATE_LIMIT_RESPONSE = `HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "accepted": false,
  "eventType": "rate_limited",
  "reason": "rate limit exceeded",
  "retryAfter": 42,
  "timestamp": "2026-05-13T12:00:00.050Z"
}`

export const ESP32_PAYLOADS = {
  telemetry: ESP32_TELEMETRY_EXAMPLE,
  heartbeat: ESP32_HEARTBEAT_EXAMPLE,
  event: ESP32_EVENT_EXAMPLE,
  successResponse: ESP32_SUCCESS_RESPONSE,
  errorResponse: ESP32_ERROR_RESPONSE,
  rateLimitResponse: ESP32_RATE_LIMIT_RESPONSE,
} as const
