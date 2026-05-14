import type { EnvironmentalHealthScore, TelemetryVarianceAnalysis, AlertDensityMetrics } from "./types"
import { scoreToStatus } from "./types"

interface HealthInput {
  temperature: number | null
  humidity: number | null
  co2: number | null
  targetTemp: number
  targetHum: number
  targetCo2: number
  variance: TelemetryVarianceAnalysis
  alertDensity: AlertDensityMetrics
}

function tempScore(val: number, target: number): number {
  const diff = Math.abs(val - target)
  if (diff <= 0.5) return 100
  if (diff <= 1.0) return 85
  if (diff <= 1.5) return 65
  if (diff <= 2.5) return 40
  return 20
}

function humidityScore(val: number, target: number): number {
  const diff = Math.abs(val - target)
  if (diff <= 2) return 100
  if (diff <= 5) return 80
  if (diff <= 10) return 55
  if (diff <= 15) return 30
  return 15
}

function co2Score(val: number, target: number): number {
  const diff = val - target
  if (diff <= 10) return 100
  if (diff <= 30) return 80
  if (diff <= 60) return 55
  if (diff <= 100) return 30
  return 10
}

function computeVariancePenalty(variance: TelemetryVarianceAnalysis): number {
  const v = variance.temperatureVariance + variance.humidityVariance * 0.3 + variance.co2Variance * 0.05
  if (v <= 0.5) return 0
  if (v <= 1.0) return 5
  if (v <= 2.0) return 15
  if (v <= 4.0) return 30
  return 50
}

function computeAlertPenalty(density: AlertDensityMetrics): number {
  if (density.totalAlerts === 0) return 0
  const criticalFactor = density.criticalRatio * 50
  const warningFactor = density.warningRatio * 20
  const freqPenalty = Math.min(density.alertsPerHour * 5, 30)
  return Math.min(criticalFactor + warningFactor + freqPenalty, 100)
}

export function calculateEnvironmentalHealth(input: HealthInput): EnvironmentalHealthScore {
  const t = input.temperature ?? input.targetTemp
  const h = input.humidity ?? input.targetHum
  const c = input.co2 ?? input.targetCo2

  const rawTemp = tempScore(t, input.targetTemp)
  const rawHum = humidityScore(h, input.targetHum)
  const rawCo2 = co2Score(c, input.targetCo2)

  const baseScore = Math.round(rawTemp * 0.4 + rawHum * 0.35 + rawCo2 * 0.25)
  const varPenalty = computeVariancePenalty(input.variance)
  const altPenalty = computeAlertPenalty(input.alertDensity)

  const final = Math.max(0, Math.min(100, baseScore - varPenalty - altPenalty))

  return {
    score: final,
    status: scoreToStatus(final),
    label: "Environmental Health",
    temperatureScore: rawTemp,
    humidityScore: rawHum,
    co2Score: rawCo2,
    variancePenalty: varPenalty,
    alertPenalty: altPenalty,
  }
}
