export type IngestionSource = "simulator" | "esp32" | "mqtt" | "api"

export type IngestionEventType =
  | "telemetry_accepted"
  | "malformed_payload_rejected"
  | "normalization_applied"
  | "stale_timestamp_ignored"
  | "device_heartbeat_accepted"
  | "environmental_event_created"

export interface IngestionResult {
  accepted: boolean
  eventType: IngestionEventType
  reason?: string
  normalized?: boolean
}

export interface TelemetryPayload {
  version: 1
  source: IngestionSource
  timestamp: string
  deviceId: string
  deploymentId: string
  metrics: {
    temperature?: number
    humidity?: number
    co2?: number
    energyUsage?: number
  }
  environmentalState?: string
  operationalMode?: string
}

export interface DeviceHeartbeatPayload {
  version: 1
  source: IngestionSource
  timestamp: string
  deviceId: string
  deviceType: string
  status: string
  health: number
  uptime: number
  deploymentId: string
}

export interface EnvironmentalEventPayload {
  version: 1
  source: IngestionSource
  timestamp: string
  type: "state_change" | "threshold_breach" | "alert"
  deploymentId: string
  previousState?: string
  currentState: string
  severity?: "info" | "warning" | "critical"
  description?: string
  metrics?: {
    temperature?: number
    humidity?: number
    co2?: number
    energyUsage?: number
  }
}

export const CURRENT_PAYLOAD_VERSION = 1 as const
