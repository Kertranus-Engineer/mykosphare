/**
 * Camera Upload JSON Schema — MYKOSPHARE Visual Intelligence
 *
 * Future ESP32-CAM / smartphone / manual uploads should produce
 * entries matching this schema. The system auto-discovers images
 * listed here when Data Source is set to "Real Data".
 *
 * Each entry requires:
 *   id        — unique capture identifier (e.g., "cam-20260531-001")
 *   imageUrl  — public path to the image file
 *   timestamp — ISO 8601 capture time
 *   source    — capture origin: "manual" | "esp32cam" | "smartphone" | "api"
 *   notes     — optional human-readable annotation
 */
export interface CameraCaptureEntry {
  id: string
  imageUrl: string
  timestamp: string
  source: "manual" | "esp32cam" | "smartphone" | "api"
  notes?: string
}
