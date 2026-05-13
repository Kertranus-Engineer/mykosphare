import { useMemo } from "react"

export interface DeviceInfo {
  id: string
  model: string
  role: string
  status: "online" | "warning" | "offline"
  uptime: string
  health: number
  lastSync: string
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const DEVICE_DEFS = [
  { model: "SHT31", role: "Temperature / Humidity", idlePower: 0.01 },
  { model: "MH-Z19B", role: "CO₂ Sensor", idlePower: 0.03 },
  { model: "SCT-013", role: "Energy Monitor", idlePower: 0.02 },
  { model: "AIRFLOW-01", role: "Air Velocity", idlePower: 0.015 },
  { model: "HUMIDIFIER-01", role: "Misting Actuator", idlePower: 0.12 },
  { model: "FAN-01", role: "Exhaust Fan", idlePower: 0.08 },
]

function generateDevice(index: number, elapsed: number): DeviceInfo {
  const def = DEVICE_DEFS[index]
  const healthBase = 94 + Math.sin(elapsed * 0.0005 + index) * 5
  const health = Math.min(99.9, Math.max(85, Math.round(healthBase * 10) / 10))

  const statuses: DeviceInfo["status"][] = ["online", "online", "online", "online", "online", "warning"]
  const status = health < 90 ? "warning" : health > 98 ? statuses[index % statuses.length] : "online"

  const uptimeBase = Math.max(0, elapsed - index * 360)
  const displayUptime = uptimeBase > 0 ? fmtDuration(uptimeBase) : "0m"

  const syncMinutes = Math.floor(Math.max(0, (Math.sin(elapsed * 0.002 + index) + 1) * 30))
  const syncDisplay = syncMinutes < 1 ? "now" : `${syncMinutes}m ago`

  return {
    id: `${def.model}-${String(index + 1).padStart(2, "0")}`,
    model: def.model,
    role: def.role,
    status,
    uptime: displayUptime,
    health,
    lastSync: syncDisplay,
  }
}

let sessionStart = Date.now()

export function getSessionElapsed(): number {
  return Math.floor((Date.now() - sessionStart) / 1000)
}

export const DEPLOYMENT_ID = "MYK-CH-001"
export const CLUSTER = "Alpha"
export const REGION = "NA-East / DC-02"
export const SOFTWARE_VERSION = "v0.1.0"

let uptimeCounter = 0
let uptimeSeconds = 0

export function tickUptime(seconds: number) {
  uptimeSeconds = seconds
  uptimeCounter++
}

export function getDeviceSnapshot(): { device_id: string; device_type: string | null; status: string | null; health: number | null; uptime: number | null }[] {
  const elapsed = uptimeSeconds
  return DEVICE_DEFS.map((def, i) => {
    const healthBase = 94 + Math.sin(elapsed * 0.0005 + i) * 5
    const health = Math.min(99.9, Math.max(85, Math.round(healthBase * 10) / 10))
    const statuses: DeviceInfo["status"][] = ["online", "online", "online", "online", "online", "warning"]
    const status = health < 90 ? "warning" : health > 98 ? statuses[i % statuses.length] : "online"
    return {
      device_id: `${def.model}-${String(i + 1).padStart(2, "0")}`,
      device_type: def.model,
      status,
      health,
      uptime: Math.max(0, elapsed - i * 360),
    }
  })
}

export function getUptime(): string {
  return fmtDuration(uptimeSeconds)
}

export function getUptimeRaw(): number {
  return uptimeSeconds
}

export function useDeviceRegistry(): DeviceInfo[] {
  return useMemo(() => {
    const elapsed = getSessionElapsed()
    return DEVICE_DEFS.map((_, i) => generateDevice(i, elapsed))
  }, [])
}
