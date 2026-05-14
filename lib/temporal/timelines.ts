import type { TimelineEvent, ComparativeSnapshot, ComparativeWindow } from "./types"
import { WINDOW_MS, WINDOW_LABELS } from "./types"

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stddev(nums: number[], mean: number): number {
  if (nums.length < 2) return 0
  const sqDiffs = nums.map((n) => (n - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (nums.length - 1))
}

export function buildTimeline(
  alerts: { severity: string | null; created_at: string; title: string | null; description: string | null }[],
  devices?: { status: string | null; last_sync: string | null; device_id: string | null }[]
): TimelineEvent[] {
  const events: TimelineEvent[] = alerts.map((a) => ({
    id: `alert-${a.created_at}`,
    timestamp: a.created_at,
    type: a.severity === "critical" ? "threshold_breach" : a.severity === "warning" ? "alert" : "recovery",
    label: a.title ?? "Unknown Event",
    description: a.description ?? "",
    severity: (a.severity as TimelineEvent["severity"]) ?? "info",
  }))

  if (devices) {
    const now = Date.now()
    for (const d of devices) {
      if (!d.last_sync || !d.device_id) continue
      const syncTime = new Date(d.last_sync).getTime()
      const age = now - syncTime
      if (d.status === "offline" || d.status === "error") {
        events.push({
          id: `device-offline-${d.device_id}-${d.last_sync}`,
          timestamp: d.last_sync,
          type: "device_event",
          label: "Device Disconnected",
          description: `${d.device_id} went ${d.status} — check network connectivity and power`,
          severity: "critical",
        })
      } else if (d.status === "warning") {
        events.push({
          id: `device-warning-${d.device_id}-${d.last_sync}`,
          timestamp: d.last_sync,
          type: "device_event",
          label: "Device Warning",
          description: `${d.device_id} reported warning status — degraded operation`,
          severity: "warning",
        })
      } else if (age < 60_000) {
        events.push({
          id: `device-reconnect-${d.device_id}-${d.last_sync}`,
          timestamp: d.last_sync,
          type: "recovery",
          label: "Device Reconnected",
          description: `${d.device_id} is back online after ${Math.round(age / 1000)}s`,
          severity: "info",
        })
      }
    }
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function buildComparativeSnapshots(
  telemetry: { created_at: string; temperature: number | null; humidity: number | null; co2: number | null; energy_usage: number | null; environmental_state: string | null }[],
  alerts: { severity: string | null; created_at: string }[],
  windows: ComparativeWindow[] = ["1h", "6h", "24h", "7d"]
): ComparativeSnapshot[] {
  return windows.map((window) => {
    const cutoff = Date.now() - WINDOW_MS[window]
    const tel = telemetry.filter((r) => new Date(r.created_at).getTime() >= cutoff)
    const alt = alerts.filter((r) => new Date(r.created_at).getTime() >= cutoff)

    const temps = tel.map((r) => r.temperature).filter((t): t is number => t !== null)
    const hums = tel.map((r) => r.humidity).filter((h): h is number => h !== null)
    const co2s = tel.map((r) => r.co2).filter((c): c is number => c !== null)
    const energies = tel.map((r) => r.energy_usage).filter((e): e is number => e !== null)
    const states = tel.map((r) => r.environmental_state).filter((s): s is string => s !== null)

    const tMean = average(temps) || 24.5
    const hMean = average(hums) || 61
    const cMean = average(co2s) || 420
    const eMean = average(energies) || 1.8
    const stableCount = states.filter((s) => s === "STABLE").length

    return {
      window,
      avgTemperature: Math.round(tMean * 10) / 10,
      avgHumidity: Math.round(hMean * 10) / 10,
      avgCo2: Math.round(cMean),
      avgEnergy: Math.round(eMean * 100) / 100,
      varianceTemperature: Math.round(stddev(temps, tMean) * 10) / 10,
      varianceHumidity: Math.round(stddev(hums, hMean) * 10) / 10,
      varianceCo2: Math.round(stddev(co2s, cMean)),
      alertCount: alt.length,
      stabilityPct: states.length > 0 ? Math.round((stableCount / states.length) * 100) : 100,
      dataPoints: tel.length,
    }
  })
}
