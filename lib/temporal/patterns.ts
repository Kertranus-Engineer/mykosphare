import type { TrendDirection } from "./types"

interface PatternInput {
  alertTimestamps: string[]
  telemetryStates: string[]
  temps: number[]
  hums: number[]
  co2s: number[]
  energies: number[]
}

export interface AlertFrequencyEvolution {
  hourly: { hour: string; count: number }[]
  trend: TrendDirection
  peakHour: string | null
  quietHour: string | null
}

export interface VarianceEvolution {
  metric: string
  periods: { label: string; variance: number }[]
  direction: TrendDirection
}

export interface PacketStabilityHistory {
  overall: number
  byWindow: { window: string; stability: number }[]
}

export function analyzeAlertFrequency(alerts: string[]): AlertFrequencyEvolution {
  const hourly = new Map<string, number>()
  for (const ts of alerts) {
    const d = new Date(ts)
    const hour = `${String(d.getHours()).padStart(2, "0")}:00`
    hourly.set(hour, (hourly.get(hour) ?? 0) + 1)
  }

  const entries = Array.from(hourly.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  const counts = entries.map(([, c]) => c)
  const mid = Math.floor(entries.length / 2)
  const firstHalf = counts.slice(0, mid).reduce((s, c) => s + c, 0) / Math.max(mid, 1)
  const secondHalf = counts.slice(mid).reduce((s, c) => s + c, 0) / Math.max(entries.length - mid, 1)

  let trend: TrendDirection = "stable"
  if (secondHalf > firstHalf * 1.2) trend = "rising"
  else if (secondHalf < firstHalf * 0.8) trend = "falling"

  let peakHour: string | null = null
  let quietHour: string | null = null
  let maxCount = 0
  let minCount = Infinity
  for (const [hour, count] of entries) {
    if (count > maxCount) { maxCount = count; peakHour = hour }
    if (count < minCount) { minCount = count; quietHour = hour }
  }

  return { hourly: entries.map(([hour, count]) => ({ hour, count })), trend, peakHour, quietHour }
}

export function analyzeVarianceEvolution(
  values: number[],
  metric: string,
  periods: number = 4
): VarianceEvolution {
  if (values.length < periods) {
    return {
      metric,
      periods: [{ label: "all", variance: 0 }],
      direction: "stable",
    }
  }

  const perPeriod = Math.max(1, Math.floor(values.length / periods))
  const result: { label: string; variance: number }[] = []

  for (let i = 0; i < periods; i++) {
    const slice = values.slice(i * perPeriod, (i + 1) * perPeriod)
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length
    const variance = slice.length > 1
      ? Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / (slice.length - 1))
      : 0
    result.push({ label: `P${i + 1}`, variance: Math.round(variance * 100) / 100 })
  }

  const firstV = result[0]?.variance ?? 0
  const lastV = result[result.length - 1]?.variance ?? 0
  let direction: TrendDirection = "stable"
  if (lastV > firstV * 1.3) direction = "rising"
  else if (lastV < firstV * 0.7) direction = "falling"

  return { metric, periods: result, direction }
}

export function calculatePacketStability(states: string[]): PacketStabilityHistory {
  if (states.length === 0) return { overall: 100, byWindow: [] }

  const total = states.length
  const stable = states.filter((s) => s === "STABLE").length
  const overall = Math.round((stable / total) * 100)

  const windowSize = Math.max(1, Math.floor(total / 4))
  const byWindow: { window: string; stability: number }[] = []
  for (let i = 0; i < 4; i++) {
    const slice = states.slice(i * windowSize, (i + 1) * windowSize)
    if (slice.length === 0) continue
    const wStable = slice.filter((s) => s === "STABLE").length
    byWindow.push({
      window: `W${i + 1}`,
      stability: Math.round((wStable / slice.length) * 100),
    })
  }

  return { overall, byWindow }
}
