import type { DeviceReliabilityScore } from "./types"
import { scoreToStatus } from "./types"

interface DeviceInfo {
  status: string | null
  health: number | null
  uptime: number | null
  last_sync: string | null
}

interface ReliabilityInput {
  devices: DeviceInfo[]
  heartbeatTimestamps: string[]
}

function calcHeartbeatCompliance(heartbeats: string[], periodMs: number = 3600_000): number {
  if (heartbeats.length === 0) return 0
  const expectedCount = periodMs / 60_000
  const actualCount = heartbeats.length
  return Math.min(100, Math.round((actualCount / expectedCount) * 100))
}

export function calculateDeviceReliability(input: ReliabilityInput): DeviceReliabilityScore {
  const totalDevices = Math.max(input.devices.length, 1)
  const onlineDevices = input.devices.filter((d) => d.status === "online").length
  const avgHealth = input.devices.length > 0
    ? Math.round(input.devices.reduce((s, d) => s + (d.health ?? 0), 0) / input.devices.length)
    : 100
  const avgUptime = input.devices.length > 0
    ? Math.round(input.devices.reduce((s, d) => s + (d.uptime ?? 0), 0) / input.devices.length)
    : 0
  const heartbeatCompliance = calcHeartbeatCompliance(input.heartbeatTimestamps)

  const onlineRatio = (onlineDevices / totalDevices) * 100
  const healthFactor = avgHealth * 0.4

  const score = Math.max(0, Math.min(100, Math.round(
    onlineRatio * 0.3 + healthFactor + heartbeatCompliance * 0.3
  )))

  return {
    score,
    status: scoreToStatus(score),
    label: "Device Reliability",
    onlineDevices,
    totalDevices,
    avgHealth,
    avgUptime,
    heartbeatCompliance,
  }
}
