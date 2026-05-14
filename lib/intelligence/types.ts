export type OperationalStatus = "optimal" | "stable" | "degraded" | "unstable" | "critical"

export interface ScoredMetric {
  score: number
  status: OperationalStatus
  label: string
}

export interface EnvironmentalHealthScore extends ScoredMetric {
  temperatureScore: number
  humidityScore: number
  co2Score: number
  variancePenalty: number
  alertPenalty: number
}

export interface StabilityIndex extends ScoredMetric {
  telemetryStability: number
  alertFreeDuration: number
  fluctuationRate: number
  periodHours: number
}

export interface DeviceReliabilityScore extends ScoredMetric {
  onlineDevices: number
  totalDevices: number
  avgHealth: number
  avgUptime: number
  heartbeatCompliance: number
}

export interface AlertDensityMetrics {
  totalAlerts: number
  alertsPerHour: number
  criticalRatio: number
  warningRatio: number
  infoRatio: number
  mostFrequentAlert: string | null
}

export interface TelemetryVarianceAnalysis {
  temperatureVariance: number
  humidityVariance: number
  co2Variance: number
  smoothnessScore: ScoredMetric
  peakDeviation: number
}

export interface UptimeQualityMetrics {
  totalRuntime: number
  uptimePercentage: number
  disconnections: number
  avgSessionDuration: number
}

export interface RollingAverage {
  temperature: number
  humidity: number
  co2: number
  energy: number
  periodMinutes: number
}

export interface AlertDurationMetrics {
  avgResolutionMs: number | null
  medianResolutionMs: number | null
  longestActive: number | null
  bySeverity: Record<string, { count: number; avgMs: number | null }>
}

export interface OperationalSummary {
  overall: ScoredMetric
  health: EnvironmentalHealthScore
  stability: StabilityIndex
  reliability: DeviceReliabilityScore
  alertDensity: AlertDensityMetrics
  variance: TelemetryVarianceAnalysis
  rollingAvg: RollingAverage
  alertDurations: AlertDurationMetrics
  generatedAt: string
  connected: boolean
}

export function scoreToStatus(score: number): OperationalStatus {
  if (score >= 90) return "optimal"
  if (score >= 75) return "stable"
  if (score >= 55) return "degraded"
  if (score >= 35) return "unstable"
  return "critical"
}

export function statusColor(status: OperationalStatus): string {
  switch (status) {
    case "optimal": return "emerald"
    case "stable": return "blue"
    case "degraded": return "amber"
    case "unstable": return "orange"
    case "critical": return "red"
  }
}
