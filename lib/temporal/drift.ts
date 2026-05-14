import type { DriftMetric, DriftAnalysis, TrendDirection, ComparativeWindow } from "./types"
import { WINDOW_MS } from "./types"

interface DriftInput {
  currentValues: number[]
  baselineValues: number[]
  metric: string
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function determineDriftDirection(currentMean: number, baselineMean: number): TrendDirection {
  const diff = currentMean - baselineMean
  if (Math.abs(diff) < 0.01) return "stable"
  return diff > 0 ? "rising" : "falling"
}

export function calculateDrift(input: DriftInput): DriftMetric {
  const currentMean = average(input.currentValues)
  const baselineMean = average(input.baselineValues)
  const driftMagnitude = Math.abs(currentMean - baselineMean)
  const driftPercent = baselineMean !== 0
    ? Math.round((driftMagnitude / baselineMean) * 1000) / 10
    : 0
  const direction = determineDriftDirection(currentMean, baselineMean)

  return {
    metric: input.metric,
    currentMean: Math.round(currentMean * 100) / 100,
    baselineMean: Math.round(baselineMean * 100) / 100,
    driftMagnitude: Math.round(driftMagnitude * 100) / 100,
    driftPercent,
    direction,
    significant: driftPercent > 5,
  }
}

export function analyzeDrift(
  currentTemps: number[],
  currentHums: number[],
  currentCo2s: number[],
  baselineTemps: number[],
  baselineHums: number[],
  baselineCo2s: number[],
  window: ComparativeWindow
): DriftAnalysis {
  const metrics = [
    calculateDrift({ currentValues: currentTemps, baselineValues: baselineTemps, metric: "temperature" }),
    calculateDrift({ currentValues: currentHums, baselineValues: baselineHums, metric: "humidity" }),
    calculateDrift({ currentValues: currentCo2s, baselineValues: baselineCo2s, metric: "co2" }),
  ]

  const significantChanges = metrics.filter((m) => m.significant).length
  const overallDrift = metrics.length > 0
    ? Math.round(metrics.reduce((s, m) => s + m.driftPercent, 0) / metrics.length * 10) / 10
    : 0

  return { window, metrics, overallDrift, significantChanges }
}
