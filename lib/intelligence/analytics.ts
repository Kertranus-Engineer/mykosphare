import type { AlertDensityMetrics, TelemetryVarianceAnalysis, UptimeQualityMetrics, RollingAverage, AlertDurationMetrics } from "./types"

interface AlertRecord {
  severity: string | null
  created_at: string
  resolved_at: string | null
}

interface TelemetryRecord {
  temperature: number | null
  humidity: number | null
  co2: number | null
  energy_usage: number | null
  created_at: string
}

interface DeviceRecord {
  status: string | null
  last_sync: string | null
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stddev(nums: number[], mean: number): number {
  if (nums.length < 2) return 0
  const sqDiffs = nums.map((n) => (n - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (nums.length - 1))
}

export function calculateAlertDensity(alerts: AlertRecord[], hours: number = 24): AlertDensityMetrics {
  const total = alerts.length
  const critical = alerts.filter((a) => a.severity === "critical").length
  const warning = alerts.filter((a) => a.severity === "warning").length
  const info = alerts.filter((a) => a.severity === "info" || (!a.severity)).length

  const freq = new Map<string, number>()
  for (const a of alerts) {
    const title = a.severity ?? "unknown"
    freq.set(title, (freq.get(title) ?? 0) + 1)
  }
  let mostFrequentAlert: string | null = null
  let maxFreq = 0
  for (const [key, count] of freq) {
    if (count > maxFreq) {
      maxFreq = count
      mostFrequentAlert = key
    }
  }

  return {
    totalAlerts: total,
    alertsPerHour: hours > 0 ? Math.round((total / hours) * 10) / 10 : 0,
    criticalRatio: total > 0 ? critical / total : 0,
    warningRatio: total > 0 ? warning / total : 0,
    infoRatio: total > 0 ? info / total : 0,
    mostFrequentAlert,
  }
}

export function calculateTelemetryVariance(rows: TelemetryRecord[]): TelemetryVarianceAnalysis {
  const temps = rows.map((r) => r.temperature).filter((t): t is number => t !== null)
  const hums = rows.map((r) => r.humidity).filter((h): h is number => h !== null)
  const co2s = rows.map((r) => r.co2).filter((c): c is number => c !== null)

  const tMean = average(temps) || 24.5
  const hMean = average(hums) || 61
  const cMean = average(co2s) || 420

  const tVar = Math.round(stddev(temps, tMean) * 10) / 10
  const hVar = Math.round(stddev(hums, hMean) * 10) / 10
  const cVar = Math.round(stddev(co2s, cMean))

  const allValues = [...temps, ...hums, ...co2s]
  const grandMean = average(allValues)
  const maxDev = allValues.length > 0
    ? Math.round(Math.max(...allValues.map((v) => Math.abs(v - grandMean))) * 10) / 10
    : 0

  const cv = grandMean !== 0 ? (stddev(allValues, grandMean) / grandMean) : 0
  const smoothnessRaw = Math.max(0, Math.min(100, Math.round((1 - Math.min(cv, 0.5) / 0.5) * 100)))
  let smoothnessStatus: "optimal" | "stable" | "degraded" | "unstable" | "critical"
  if (smoothnessRaw >= 90) smoothnessStatus = "optimal"
  else if (smoothnessRaw >= 75) smoothnessStatus = "stable"
  else if (smoothnessRaw >= 55) smoothnessStatus = "degraded"
  else if (smoothnessRaw >= 35) smoothnessStatus = "unstable"
  else smoothnessStatus = "critical"

  return {
    temperatureVariance: tVar,
    humidityVariance: hVar,
    co2Variance: cVar,
    smoothnessScore: { score: smoothnessRaw, status: smoothnessStatus, label: "Telemetry Smoothness" },
    peakDeviation: maxDev,
  }
}

export function calculateRollingAverage(rows: TelemetryRecord[], periodMinutes: number = 60): RollingAverage {
  const slice = rows.slice(0, Math.max(periodMinutes, 1))
  const temps = slice.map((r) => r.temperature).filter((t): t is number => t !== null)
  const hums = slice.map((r) => r.humidity).filter((h): h is number => h !== null)
  const co2s = slice.map((r) => r.co2).filter((c): c is number => c !== null)
  const energies = slice.map((r) => r.energy_usage).filter((e): e is number => e !== null)

  return {
    temperature: Math.round(average(temps) * 10) / 10,
    humidity: Math.round(average(hums) * 10) / 10,
    co2: Math.round(average(co2s)),
    energy: Math.round(average(energies) * 100) / 100,
    periodMinutes,
  }
}

export function calculateUptimeQuality(devices: DeviceRecord[], periodMs: number = 86400_000): UptimeQualityMetrics {
  const totalRuntime = periodMs / 1000
  const online = devices.filter((d) => d.status === "online").length
  const total = Math.max(devices.length, 1)
  const uptimePct = Math.round((online / total) * 100)

  const disconnections = devices.filter((d) => d.status === "offline" || d.status === "error").length
  const avgSession = devices.length > 0
    ? Math.round(totalRuntime / devices.length)
    : totalRuntime

  return {
    totalRuntime: Math.round(totalRuntime),
    uptimePercentage: uptimePct,
    disconnections,
    avgSessionDuration: avgSession,
  }
}

export function calculateAlertDurationMetrics(alerts: AlertRecord[]): AlertDurationMetrics {
  const resolved = alerts.filter((a) => a.resolved_at !== null && a.created_at)
  const bySeverity: Record<string, number[]> = {}

  let totalMs = 0
  let count = 0
  const durations: number[] = []

  for (const a of resolved) {
    const created = new Date(a.created_at).getTime()
    const resolvedAt = new Date(a.resolved_at!).getTime()
    const dur = resolvedAt - created
    durations.push(dur)
    totalMs += dur
    count++
    const sev = a.severity ?? "unknown"
    if (!bySeverity[sev]) bySeverity[sev] = []
    bySeverity[sev].push(dur)
  }

  durations.sort((a, b) => a - b)
  const median = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : null

  const activeDurations = alerts
    .filter((a) => !a.resolved_at && a.created_at)
    .map((a) => Date.now() - new Date(a.created_at).getTime())
  const longestActive = activeDurations.length > 0 ? Math.max(...activeDurations) : null

  const bySeverityResult: AlertDurationMetrics["bySeverity"] = {}
  for (const [sev, durs] of Object.entries(bySeverity)) {
    const avg = durs.length > 0 ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : null
    bySeverityResult[sev] = { count: durs.length, avgMs: avg }
  }

  return {
    avgResolutionMs: count > 0 ? Math.round(totalMs / count) : null,
    medianResolutionMs: median,
    longestActive,
    bySeverity: bySeverityResult,
  }
}
