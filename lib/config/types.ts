export interface SystemConfig {
  targetTemp: number
  targetHumidity: number
  tempTolerance: number
  humTolerance: number
  autoFan: boolean
  autoHumidifier: boolean
  autoFailsafe: boolean
  recoveryMode: boolean
  fanOnTemp: number
  fanOffTemp: number
  criticalTemp: number
  emergencyTemp: number
  telemetryInterval: number
  confidenceRecovery: "slow" | "normal" | "aggressive"
  reconnectStrategy: "passive" | "adaptive" | "aggressive"
}

export type DeployState = "draft" | "validating" | "transmitting" | "deployed" | "failed" | "rollback"

export interface ConfigVersion {
  id: number
  config: SystemConfig
  state: DeployState
  createdAt: string
  deployedAt: string | null
}

export const DEFAULT_CONFIG: SystemConfig = {
  targetTemp: 24,
  targetHumidity: 65,
  tempTolerance: 2,
  humTolerance: 10,
  autoFan: true,
  autoHumidifier: true,
  autoFailsafe: true,
  recoveryMode: true,
  fanOnTemp: 28,
  fanOffTemp: 26,
  criticalTemp: 32,
  emergencyTemp: 35,
  telemetryInterval: 3000,
  confidenceRecovery: "normal",
  reconnectStrategy: "adaptive",
}

export const PROFILES: Record<string, { label: string; desc: string; config: Partial<SystemConfig> }> = {
  incubation: {
    label: "Incubation",
    desc: "Warm · High humidity · Low airflow",
    config: { targetTemp: 26, targetHumidity: 85, fanOnTemp: 30, fanOffTemp: 28, autoFan: false },
  },
  fruiting: {
    label: "Fruiting",
    desc: "Cooler · Moderate humidity · Higher airflow",
    config: { targetTemp: 22, targetHumidity: 70, fanOnTemp: 25, fanOffTemp: 23 },
  },
  sterilization: {
    label: "Sterilization",
    desc: "High heat · Maximum airflow · Aggressive failsafe",
    config: { targetTemp: 32, targetHumidity: 40, fanOnTemp: 28, emergencyTemp: 34, confidenceRecovery: "aggressive" },
  },
  recovery: {
    label: "Recovery",
    desc: "Conservative automation · High sensitivity",
    config: { targetTemp: 24, targetHumidity: 60, autoFailsafe: false, confidenceRecovery: "slow" },
  },
}
