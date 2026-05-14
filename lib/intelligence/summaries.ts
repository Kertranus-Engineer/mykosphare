import type { OperationalSummary, ScoredMetric } from "./types"
import { scoreToStatus } from "./types"
import { calculateEnvironmentalHealth } from "./health-score"
import { calculateStabilityIndex } from "./stability"
import { calculateDeviceReliability } from "./reliability"
import { calculateAlertDensity, calculateTelemetryVariance, calculateRollingAverage, calculateUptimeQuality, calculateAlertDurationMetrics } from "./analytics"

export interface SummaryInput {
  telemetryRows: { temperature: number | null; humidity: number | null; co2: number | null; energy_usage: number | null; environmental_state: string | null; created_at: string }[]
  alerts: { severity: string | null; created_at: string; resolved_at: string | null }[]
  devices: { status: string | null; health: number | null; uptime: number | null; last_sync: string | null }[]
  heartbeatTimestamps: string[]
  targetTemp: number
  targetHum: number
  targetCo2: number
}

function calculateOverall(scores: ScoredMetric[]): ScoredMetric {
  if (scores.length === 0) return { score: 0, status: "critical", label: "Overall" }
  const avg = Math.round(scores.reduce((s, m) => s + m.score, 0) / scores.length)
  const status = scoreToStatus(avg)
  return { score: avg, status, label: "Overall Operational Intelligence" }
}

export interface SummaryConfig {
  alertAnalysisHours?: number
  rollingPeriodMinutes?: number
}

export function generateOperationalSummary(input: SummaryInput, config: SummaryConfig & { connected?: boolean } = {}): OperationalSummary {
  const { alertAnalysisHours = 24, rollingPeriodMinutes = 60, connected = false } = config

  const variance = calculateTelemetryVariance(input.telemetryRows)
  const alertDensity = calculateAlertDensity(input.alerts, alertAnalysisHours)
  const rollingAvg = calculateRollingAverage(input.telemetryRows, rollingPeriodMinutes)

  const health = calculateEnvironmentalHealth({
    temperature: input.telemetryRows[0]?.temperature ?? null,
    humidity: input.telemetryRows[0]?.humidity ?? null,
    co2: input.telemetryRows[0]?.co2 ?? null,
    targetTemp: input.targetTemp,
    targetHum: input.targetHum,
    targetCo2: input.targetCo2,
    variance,
    alertDensity,
  })

  const stability = calculateStabilityIndex({
    telemetryRows: input.telemetryRows,
    rollingAvg,
    alertTimestamps: input.alerts.map((a) => a.created_at),
  })

  const reliability = calculateDeviceReliability({
    devices: input.devices,
    heartbeatTimestamps: input.heartbeatTimestamps,
  })

  const alertDurations = calculateAlertDurationMetrics(input.alerts)

  const overall = calculateOverall([health, stability, reliability])

  return {
    overall,
    health,
    stability,
    reliability,
    alertDensity,
    variance,
    rollingAvg,
    alertDurations,
    generatedAt: new Date().toISOString(),
    connected,
  }
}
