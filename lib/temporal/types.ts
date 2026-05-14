export type TrendDirection = "rising" | "falling" | "stable" | "volatile"

export type ComparativeWindow = "1h" | "6h" | "24h" | "7d"

export interface TrendPoint {
  timestamp: string
  value: number
  metric: string
}

export interface TrendAnalysis {
  metric: string
  direction: TrendDirection
  slope: number
  volatility: number
  currentValue: number
  previousValue: number
  changePercent: number
  samples: number
}

export interface DriftMetric {
  metric: string
  currentMean: number
  baselineMean: number
  driftMagnitude: number
  driftPercent: number
  direction: TrendDirection
  significant: boolean
}

export interface DriftAnalysis {
  window: ComparativeWindow
  metrics: DriftMetric[]
  overallDrift: number
  significantChanges: number
}

export interface ForecastPoint {
  period: string
  projectedValue: number
  confidence: number
  lowerBound: number
  upperBound: number
}

export interface Forecast {
  metric: string
  currentValue: number
  projectedNext: number
  projectedChange: number
  projectedInstability: number
  breachProbability: number
  horizon: string
}

export interface TimelineEvent {
  id: string
  timestamp: string
  type: "alert" | "state_change" | "threshold_breach" | "recovery" | "device_event"
  label: string
  description: string
  severity?: "info" | "warning" | "critical"
}

export interface ComparativeSnapshot {
  window: ComparativeWindow
  avgTemperature: number
  avgHumidity: number
  avgCo2: number
  avgEnergy: number
  varianceTemperature: number
  varianceHumidity: number
  varianceCo2: number
  alertCount: number
  stabilityPct: number
  dataPoints: number
}

export interface BehaviorMetric {
  metric: string
  reliabilityTrend: TrendDirection
  reliabilityScore: number
  uptimeTrend: TrendDirection
  uptimeScore: number
  alertFreqTrend: TrendDirection
  alertFreqPerHour: number
  packetStability: number
}

export interface TemporalSummary {
  generatedAt: string
  comparativeWindows: ComparativeSnapshot[]
  trends: TrendAnalysis[]
  drifts: DriftAnalysis[]
  forecasts: Forecast[]
  timeline: TimelineEvent[]
  behavior: BehaviorMetric[]
  worstMetric: string
  bestMetric: string
}

export const WINDOW_LABELS: Record<ComparativeWindow, string> = {
  "1h": "Last Hour",
  "6h": "Last 6 Hours",
  "24h": "Last 24 Hours",
  "7d": "Last 7 Days",
}

export const WINDOW_MS: Record<ComparativeWindow, number> = {
  "1h": 3_600_000,
  "6h": 21_600_000,
  "24h": 86_400_000,
  "7d": 604_800_000,
}
