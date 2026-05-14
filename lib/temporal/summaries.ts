import type { TemporalSummary, ComparativeWindow, TrendAnalysis } from "./types"
import { analyzeMultipleTrends, filterWindow } from "./trends"
import { analyzeDrift } from "./drift"
import { generateForecasts } from "./forecasting"
import { buildTimeline, buildComparativeSnapshots } from "./timelines"
import { analyzeBehavior } from "./behavior"
import { analyzeAlertFrequency, analyzeVarianceEvolution, calculatePacketStability } from "./patterns"

export interface TemporalInput {
  telemetry: { created_at: string; temperature: number | null; humidity: number | null; co2: number | null; energy_usage: number | null; environmental_state: string | null }[]
  alerts: { severity: string | null; created_at: string; title: string | null; description: string | null }[]
  devices: { status: string | null; health: number | null; uptime: number | null; device_id?: string | null; last_sync?: string | null }[]
  targetTemp?: number
  targetHum?: number
  targetCo2?: number
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function generateTemporalSummary(
  input: TemporalInput,
  windows: ComparativeWindow[] = ["1h", "6h", "24h", "7d"]
): TemporalSummary {
  const {
    telemetry,
    alerts,
    devices,
    targetTemp = 24.5,
    targetHum = 61,
    targetCo2 = 420,
  } = input

  const windowsData = windows.map((w) => filterWindow(telemetry, alerts, w))
  const current = windowsData[0]

  const trends = analyzeMultipleTrends(
    current.temperatures,
    current.humidities,
    current.co2s,
    current.energies
  )

  const baseline = windowsData[windowsData.length - 1]
  const drifts = windows.length >= 2 ? windows.slice(1).map((w, i) => {
    const wd = windowsData[i + 1]
    return analyzeDrift(
      wd.temperatures, wd.humidities, wd.co2s,
      baseline.temperatures, baseline.humidities, baseline.co2s,
      w
    )
  }) : []

  const forecasts = generateForecasts(
    current.temperatures,
    current.humidities,
    current.co2s,
    current.energies,
    targetTemp,
    targetHum,
    targetCo2
  )

  const timeline = buildTimeline(
    alerts,
    devices.map((d) => ({
      status: d.status,
      last_sync: d.last_sync ?? null,
      device_id: d.device_id ?? null,
    }))
  )
  const comparativeWindows = buildComparativeSnapshots(telemetry, alerts, windows)
  const behavior = analyzeBehavior({
    temps: current.temperatures,
    hums: current.humidities,
    co2s: current.co2s,
    energies: current.energies,
    alerts: current.alerts,
    devices,
  })

  const sortedTrends = [...trends].sort((a, b) => b.changePercent - a.changePercent)
  const worstMetric = sortedTrends.length > 0
    ? sortedTrends[0].metric + " (" + (sortedTrends[0].changePercent > 0 ? "+" : "") + sortedTrends[0].changePercent + "%)"
    : "none"
  const bestMetric = sortedTrends.length > 0
    ? sortedTrends[sortedTrends.length - 1].metric + " (" + (sortedTrends[sortedTrends.length - 1].changePercent > 0 ? "+" : "") + sortedTrends[sortedTrends.length - 1].changePercent + "%)"
    : "none"

  return {
    generatedAt: new Date().toISOString(),
    comparativeWindows,
    trends,
    drifts,
    forecasts,
    timeline,
    behavior,
    worstMetric,
    bestMetric,
  }
}
