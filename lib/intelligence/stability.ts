import type { StabilityIndex, RollingAverage } from "./types"
import { scoreToStatus } from "./types"

interface StabilityInput {
  telemetryRows: { environmental_state: string | null; temperature: number | null; humidity: number | null; co2: number | null; created_at: string }[]
  rollingAvg: RollingAverage
  alertTimestamps: string[]
}

function calcFluctuationRate(rows: StabilityInput["telemetryRows"]): number {
  if (rows.length < 3) return 0
  let changes = 0
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]?.environmental_state
    const curr = rows[i]?.environmental_state
    if (prev !== curr && prev !== null && curr !== null) changes++
  }
  return Math.round((changes / (rows.length - 1)) * 100)
}

function calcTelemetryStability(rows: StabilityInput["telemetryRows"]): number {
  if (rows.length < 2) return 100
  const stable = rows.filter((r) => r.environmental_state === "STABLE").length
  const optimizing = rows.filter((r) => r.environmental_state === "OPTIMIZING").length
  const recovery = rows.filter((r) => r.environmental_state === "RECOVERY").length
  const warning = rows.filter((r) => r.environmental_state === "WARNING").length
  const total = rows.length
  return Math.round(((stable + optimizing * 0.7 + recovery * 0.4) / total) * 100)
}

function calcAlertFreeDuration(alertTimestamps: string[]): number {
  if (alertTimestamps.length === 0) return Date.now() - Date.now() - 24 * 3600_000
  const sorted = alertTimestamps.map((t) => new Date(t).getTime()).sort((a, b) => b - a)
  return Date.now() - sorted[0]
}

export function calculateStabilityIndex(input: StabilityInput, periodHours: number = 24): StabilityIndex {
  const telemetryStability = calcTelemetryStability(input.telemetryRows)
  const fluctuationRate = calcFluctuationRate(input.telemetryRows)
  const alertFreeDuration = calcAlertFreeDuration(input.alertTimestamps)

  const alertFreeHours = alertFreeDuration / 3600_000
  const alertFreeScore = Math.min(100, (alertFreeHours / periodHours) * 100)
  const fluctuationPenalty = Math.min(fluctuationRate * 1.5, 40)
  const telemetryWeight = telemetryStability * 0.5

  const score = Math.max(0, Math.min(100, Math.round(telemetryWeight + alertFreeScore * 0.3 - fluctuationPenalty)))

  return {
    score,
    status: scoreToStatus(score),
    label: "System Stability",
    telemetryStability,
    alertFreeDuration,
    fluctuationRate,
    periodHours,
  }
}
