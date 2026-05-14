export type OperationalMode = "incubation" | "fruiting" | "sterilization" | "maintenance" | "emergency"

export interface ChamberTwinState {
  chamberId: string
  mode: OperationalMode
  thermalMass: number
  humidityRetention: number
  airflowEfficiency: number
  contaminationRisk: number
  operationalStress: number
  growthCyclePhase: string
  energyEfficiency: number
  lastUpdated: string
  modeStartedAt: string
  healthScore: number
}

export interface TwinThresholds {
  temperatureMin: number
  temperatureMax: number
  humidityMin: number
  humidityMax: number
  co2Max: number
  targetTemperature: number
  targetHumidity: number
  targetCo2: number
  alertSensitivity: number
  acceptableDrift: number
}

export interface TwinHealth {
  overallScore: number
  thermalScore: number
  humidityScore: number
  airflowScore: number
  contaminationScore: number
  stressScore: number
  energyScore: number
  mode: OperationalMode
}

export const MODE_THRESHOLDS: Record<OperationalMode, TwinThresholds> = {
  incubation: {
    temperatureMin: 23.5,
    temperatureMax: 26.0,
    humidityMin: 60,
    humidityMax: 70,
    co2Max: 450,
    targetTemperature: 24.8,
    targetHumidity: 65,
    targetCo2: 420,
    alertSensitivity: 0.7,
    acceptableDrift: 0.5,
  },
  fruiting: {
    temperatureMin: 21.0,
    temperatureMax: 23.5,
    humidityMin: 65,
    humidityMax: 75,
    co2Max: 400,
    targetTemperature: 22.2,
    targetHumidity: 70,
    targetCo2: 380,
    alertSensitivity: 0.8,
    acceptableDrift: 0.3,
  },
  sterilization: {
    temperatureMin: 70.0,
    temperatureMax: 95.0,
    humidityMin: 30,
    humidityMax: 50,
    co2Max: 500,
    targetTemperature: 85.0,
    targetHumidity: 40,
    targetCo2: 420,
    alertSensitivity: 0.9,
    acceptableDrift: 1.0,
  },
  maintenance: {
    temperatureMin: 18.0,
    temperatureMax: 28.0,
    humidityMin: 40,
    humidityMax: 60,
    co2Max: 600,
    targetTemperature: 22.0,
    targetHumidity: 50,
    targetCo2: 420,
    alertSensitivity: 0.5,
    acceptableDrift: 2.0,
  },
  emergency: {
    temperatureMin: 15.0,
    temperatureMax: 35.0,
    humidityMin: 30,
    humidityMax: 80,
    co2Max: 800,
    targetTemperature: 22.0,
    targetHumidity: 50,
    targetCo2: 420,
    alertSensitivity: 0.3,
    acceptableDrift: 5.0,
  },
}

export const MODE_LABELS: Record<OperationalMode, string> = {
  incubation: "Incubation",
  fruiting: "Fruiting",
  sterilization: "Sterilization",
  maintenance: "Maintenance",
  emergency: "Emergency",
}

export const MODE_COLORS: Record<OperationalMode, string> = {
  incubation: "text-emerald-500",
  fruiting: "text-amber-500",
  sterilization: "text-red-500",
  maintenance: "text-blue-500",
  emergency: "text-orange-500",
}

export const MODE_BG: Record<OperationalMode, string> = {
  incubation: "bg-emerald-500/10",
  fruiting: "bg-amber-500/10",
  sterilization: "bg-red-500/10",
  maintenance: "bg-blue-500/10",
  emergency: "bg-orange-500/10",
}

export const MODE_BORDER: Record<OperationalMode, string> = {
  incubation: "border-emerald-500/20",
  fruiting: "border-amber-500/20",
  sterilization: "border-red-500/20",
  maintenance: "border-blue-500/20",
  emergency: "border-orange-500/20",
}
