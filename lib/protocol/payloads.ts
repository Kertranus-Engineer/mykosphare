import type {
  TelemetryPayload,
  DeviceHeartbeatPayload,
  EnvironmentalEventPayload,
} from "@/lib/ingestion"

export const TELEMETRY_PAYLOAD_EXAMPLE: TelemetryPayload = {
  version: 1,
  source: "esp32",
  timestamp: "2026-05-13T12:00:00.000Z",
  deviceId: "SHT31-01",
  deploymentId: "MYK-CH-001",
  metrics: {
    temperature: 24.6,
    humidity: 61.2,
    co2: 412,
    energyUsage: 1.8,
  },
  environmentalState: "STABLE",
  operationalMode: "OPERATIONAL",
}

export const HEARTBEAT_PAYLOAD_EXAMPLE: DeviceHeartbeatPayload = {
  version: 1,
  source: "esp32",
  timestamp: "2026-05-13T12:00:00.000Z",
  deviceId: "MH-Z19B-02",
  deviceType: "MH-Z19B",
  status: "online",
  health: 97.2,
  uptime: 84600,
  deploymentId: "MYK-CH-001",
}

export const EVENT_PAYLOAD_EXAMPLE: EnvironmentalEventPayload = {
  version: 1,
  source: "esp32",
  timestamp: "2026-05-13T12:00:00.000Z",
  type: "state_change",
  deploymentId: "MYK-CH-001",
  previousState: "STABLE",
  currentState: "WARNING",
  severity: "warning",
  description: "CO₂ exceeded threshold of 420 ppm",
  metrics: {
    temperature: 24.6,
    humidity: 61.2,
    co2: 435,
    energyUsage: 1.8,
  },
}

export const TELEMETRY_PAYLOAD_MINIMAL: TelemetryPayload = {
  version: 1,
  source: "esp32",
  timestamp: "2026-05-13T12:00:00.000Z",
  deviceId: "SHT31-01",
  deploymentId: "MYK-CH-001",
  metrics: {
    temperature: 24.6,
  },
}

export const PAYLOAD_EXAMPLES = {
  telemetry: TELEMETRY_PAYLOAD_EXAMPLE,
  telemetryMinimal: TELEMETRY_PAYLOAD_MINIMAL,
  heartbeat: HEARTBEAT_PAYLOAD_EXAMPLE,
  event: EVENT_PAYLOAD_EXAMPLE,
} as const

export function getPayloadExample(type: keyof typeof PAYLOAD_EXAMPLES): object {
  return { ...PAYLOAD_EXAMPLES[type] }
}
