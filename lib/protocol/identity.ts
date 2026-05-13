export interface HardwareIdentity {
  deviceId: string
  deploymentId: string
  chamberId: string
  firmwareVersion: string
  hardwareRevision: string
  capabilities: HardwareCapability[]
}

export type HardwareCapability =
  | "temperature_sensor"
  | "humidity_sensor"
  | "co2_sensor"
  | "energy_monitor"
  | "airflow_sensor"
  | "humidifier_actuator"
  | "fan_actuator"
  | "light_controller"

export const CHAMBER_MAP = {
  "MYK-CH-001": {
    name: "Chamber Alpha",
    cluster: "Alpha",
    region: "NA-East / DC-02",
    devices: ["SHT31-01", "SHT31-02", "MH-Z19B-01", "MH-Z19B-02", "SCT-013-01", "AIRFLOW-01", "HUMIDIFIER-01", "FAN-01"],
  },
} as const

export const DEVICE_CAPABILITIES: Record<string, HardwareCapability[]> = {
  SHT31: ["temperature_sensor", "humidity_sensor"],
  "MH-Z19B": ["co2_sensor"],
  "SCT-013": ["energy_monitor"],
  AIRFLOW: ["airflow_sensor"],
  HUMIDIFIER: ["humidifier_actuator"],
  FAN: ["fan_actuator"],
} as const

export const FIRMWARE_VERSION = "v1.0.0"
export const FIRMWARE_BETA_VERSION = "v1.1.0-beta.1"

export function isChamberId(id: string): boolean {
  return id in CHAMBER_MAP
}

export function getChamberInfo(deploymentId: string) {
  return CHAMBER_MAP[deploymentId as keyof typeof CHAMBER_MAP] ?? null
}

export function getDeviceCapabilities(deviceType: string): HardwareCapability[] {
  return DEVICE_CAPABILITIES[deviceType] ?? []
}

export function inferDeviceType(deviceId: string): string {
  const prefix = deviceId.split("-")[0]
  if (prefix && DEVICE_CAPABILITIES[prefix]) return prefix
  return "unknown"
}
