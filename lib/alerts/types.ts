export type AlertSeverity = "info" | "warning" | "critical"

export type AlertStatus = "active" | "resolved"

export interface TelemetrySnapshot {
  temperature: number | null
  humidity: number | null
  co2: number | null
  energyUsage?: number | null
  deviceId?: string
  timestamp: string
}

export interface SettingsSnapshot {
  targetTemperature: number
  targetHumidity: number
  targetCo2: number
  notificationsEnabled: boolean
}

export interface RuleEvaluationParams {
  telemetry: TelemetrySnapshot
  settings: SettingsSnapshot
  previousTelemetry?: TelemetrySnapshot
  deviceId?: string
}

export interface EvaluationResult {
  triggered: boolean
  title: string
  description: string
}

export interface RuleDefinition {
  id: string
  name: string
  description: string
  defaultSeverity: AlertSeverity
  cooldownMs: number
  evaluate(params: RuleEvaluationParams): EvaluationResult
}

export interface AlertEvent {
  id: string
  ruleId: string
  severity: AlertSeverity
  title: string
  description: string
  triggeredAt: string
  deploymentId: string
}

export interface ResolvedAlertEvent {
  id: string
  ruleId: string
  severity: AlertSeverity
  title: string
  description: string
  triggeredAt: string
  resolvedAt: string
  durationMs: number
  deploymentId: string
}

export interface FrequencyRecord {
  ruleId: string
  title: string
  count24h: number
  lastTriggered: string | null
  avgDurationMs: number | null
}

export interface AlertSummary {
  active: number
  total: number
  criticalUnresolved: number
  avgResolutionMs: number | null
}

export interface CooldownState {
  lastTriggeredAt: number
  count: number
}
