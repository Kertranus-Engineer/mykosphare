import type { BehaviorMetric, TrendDirection } from "./types"

interface BehaviorInput {
  temps: number[]
  hums: number[]
  co2s: number[]
  energies: number[]
  alerts: { severity: string | null; created_at: string }[]
  devices: { status: string | null; health: number | null; uptime: number | null }[]
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function calcReliabilityTrend(statuses: string[]): TrendDirection {
  if (statuses.length < 3) return "stable"
  const recent = statuses.slice(0, Math.ceil(statuses.length / 3))
  const older = statuses.slice(-Math.ceil(statuses.length / 3))
  const recentOnline = recent.filter((s) => s === "online").length / recent.length
  const olderOnline = older.filter((s) => s === "online").length / older.length
  if (recentOnline > olderOnline + 0.1) return "rising"
  if (recentOnline < olderOnline - 0.1) return "falling"
  return "stable"
}

function calcUptimeTrend(uptimes: number[]): TrendDirection {
  if (uptimes.length < 3) return "stable"
  const recent = average(uptimes.slice(0, Math.ceil(uptimes.length / 3)))
  const older = average(uptimes.slice(-Math.ceil(uptimes.length / 3)))
  if (recent > older + 60) return "rising"
  if (recent < older - 60) return "falling"
  return "stable"
}

export function analyzeBehavior(input: BehaviorInput): BehaviorMetric[] {
  const onlineCount = input.devices.filter((d) => d.status === "online").length
  const totalDevices = Math.max(input.devices.length, 1)
  const reliabilityScore = Math.round((onlineCount / totalDevices) * 100)
  const statuses = input.devices.map((d) => d.status ?? "unknown")
  const uptimes = input.devices.map((d) => d.uptime ?? 0).filter((u) => u > 0)
  const avgUptime = uptimes.length > 0 ? Math.round(average(uptimes)) : 0

  const alertsLastHour = input.alerts.filter(
    (a) => Date.now() - new Date(a.created_at).getTime() < 3_600_000
  ).length

  const totalVar = (
    (input.temps.length > 0 ? stddev(input.temps, average(input.temps)) : 0) +
    (input.hums.length > 0 ? stddev(input.hums, average(input.hums)) : 0)
  ) / 2

  const packetStability = Math.max(0, Math.min(100, 100 - totalVar * 20))

  return [
    {
      metric: "temperature",
      reliabilityTrend: calcReliabilityTrend(statuses),
      reliabilityScore,
      uptimeTrend: calcUptimeTrend(uptimes),
      uptimeScore: avgUptime,
      alertFreqTrend: alertsLastHour > 3 ? "rising" : alertsLastHour === 0 ? "falling" : "stable",
      alertFreqPerHour: alertsLastHour,
      packetStability: Math.round(packetStability),
    },
    {
      metric: "humidity",
      reliabilityTrend: calcReliabilityTrend(statuses),
      reliabilityScore,
      uptimeTrend: calcUptimeTrend(uptimes),
      uptimeScore: avgUptime,
      alertFreqTrend: alertsLastHour > 3 ? "rising" : alertsLastHour === 0 ? "falling" : "stable",
      alertFreqPerHour: alertsLastHour,
      packetStability: Math.round(packetStability),
    },
    {
      metric: "co2",
      reliabilityTrend: calcReliabilityTrend(statuses),
      reliabilityScore,
      uptimeTrend: calcUptimeTrend(uptimes),
      uptimeScore: avgUptime,
      alertFreqTrend: alertsLastHour > 3 ? "rising" : alertsLastHour === 0 ? "falling" : "stable",
      alertFreqPerHour: alertsLastHour,
      packetStability: Math.round(packetStability),
    },
  ]
}

function stddev(nums: number[], mean: number): number {
  if (nums.length < 2) return 0
  const sqDiffs = nums.map((n) => (n - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (nums.length - 1))
}
