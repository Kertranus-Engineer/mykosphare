import type { TrendAnalysis, TrendDirection, ComparativeWindow } from "./types"
import { WINDOW_MS } from "./types"

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stddev(nums: number[], mean: number): number {
  if (nums.length < 2) return 0
  const sqDiffs = nums.map((n) => (n - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (nums.length - 1))
}

function calcSlope(values: number[]): number {
  if (values.length < 2) return 0
  const n = values.length
  const indices = values.map((_, i) => i)
  const meanX = (n - 1) / 2
  const meanY = average(values)
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY)
    den += (i - meanX) ** 2
  }
  return den !== 0 ? num / den : 0
}

function determineDirection(slope: number, volatility: number): TrendDirection {
  if (volatility > 0.5) return "volatile"
  if (slope > 0.05) return "rising"
  if (slope < -0.05) return "falling"
  return "stable"
}

export function analyzeTrend(
  values: number[],
  metric: string
): TrendAnalysis {
  if (values.length === 0) {
    return {
      metric,
      direction: "stable",
      slope: 0,
      volatility: 0,
      currentValue: 0,
      previousValue: 0,
      changePercent: 0,
      samples: 0,
    }
  }

  const currentValue = values[values.length - 1]
  const previousValue = values.length > 1 ? average(values.slice(0, -1)) : currentValue
  const mean = average(values)
  const slope = calcSlope(values)
  const volatility = stddev(values, mean)
  const direction = determineDirection(slope, volatility)

  return {
    metric,
    direction,
    slope: Math.round(slope * 1000) / 1000,
    volatility: Math.round(volatility * 100) / 100,
    currentValue: Math.round(currentValue * 10) / 10,
    previousValue: Math.round(previousValue * 10) / 10,
    changePercent: previousValue !== 0
      ? Math.round(((currentValue - previousValue) / previousValue) * 1000) / 10
      : 0,
    samples: values.length,
  }
}

export function analyzeMultipleTrends(
  temps: number[],
  hums: number[],
  co2s: number[],
  energies: number[]
): TrendAnalysis[] {
  return [
    analyzeTrend(temps, "temperature"),
    analyzeTrend(hums, "humidity"),
    analyzeTrend(co2s, "co2"),
    analyzeTrend(energies, "energy"),
  ]
}

export interface WindowedData {
  temperatures: number[]
  humidities: number[]
  co2s: number[]
  energies: number[]
  alerts: { severity: string | null; created_at: string }[]
  states: string[]
}

export function filterWindow(
  data: { created_at: string; temperature: number | null; humidity: number | null; co2: number | null; energy_usage: number | null; environmental_state: string | null }[],
  alerts: { severity: string | null; created_at: string }[],
  window: ComparativeWindow
): WindowedData {
  const cutoff = Date.now() - WINDOW_MS[window]
  const tel = data.filter((r) => new Date(r.created_at).getTime() >= cutoff)
  const alt = alerts.filter((r) => new Date(r.created_at).getTime() >= cutoff)

  return {
    temperatures: tel.map((r) => r.temperature).filter((t): t is number => t !== null),
    humidities: tel.map((r) => r.humidity).filter((h): h is number => h !== null),
    co2s: tel.map((r) => r.co2).filter((c): c is number => c !== null),
    energies: tel.map((r) => r.energy_usage).filter((e): e is number => e !== null),
    alerts: alt,
    states: tel.map((r) => r.environmental_state).filter((s): s is string => s !== null),
  }
}
