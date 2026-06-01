import type { ChamberTwinState, OperationalMode, ChamberHealth } from "./types"
import { MODE_THRESHOLDS } from "./types"

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function scoreMetric(value: number, min: number, max: number, target: number): number {
  if (value < min || value > max) return Math.max(0, 100 - Math.abs(value - target) * 5)
  const distFromTarget = Math.abs(value - target)
  const range = Math.max(max - min, 1)
  const normalized = 1 - distFromTarget / range
  return Math.round(clamp(normalized * 100, 0, 100))
}

export function createInitialTwinState(chamberId: string, mode: OperationalMode = "incubation"): ChamberTwinState {
  const now = new Date().toISOString()
  return {
    chamberId,
    mode,
    thermalMass: 75,
    humidityRetention: 70,
    airflowEfficiency: 80,
    contaminationRisk: 15,
    operationalStress: 10,
    growthCyclePhase: mode === "incubation" ? "early-incubation" : mode === "fruiting" ? "active-fruiting" : "standby",
    energyEfficiency: 70,
    lastUpdated: now,
    modeStartedAt: now,
    healthScore: 85,
  }
}

export function evolveTwinState(
  state: ChamberTwinState,
  telemetry: { temperature: number; humidity: number; co2: number },
  hasActiveAlerts: boolean,
  hasActiveIncidents: boolean,
  hasMaintenanceTasks: boolean,
  deviceHealth: number
): ChamberTwinState {
  const thresholds = MODE_THRESHOLDS[state.mode]
  const now = new Date().toISOString()

  const drift = Math.abs(telemetry.temperature - thresholds.targetTemperature)
  const stressFromDrift = clamp(drift * 8, 0, 40)

  const contaminationGrowth = hasActiveIncidents ? 0.3 : hasActiveAlerts ? 0.15 : -0.05
  const thermalChange = telemetry.temperature > thresholds.temperatureMax ? -0.2 :
    telemetry.temperature < thresholds.temperatureMin ? -0.15 : 0.05
  const humidityChange = telemetry.humidity > thresholds.humidityMax ? -0.15 :
    telemetry.humidity < thresholds.humidityMin ? -0.1 : 0.03

  const stressDecay = state.operationalStress > 20 ? -0.1 : 0.02

  return {
    ...state,
    thermalMass: clamp(state.thermalMass + thermalChange, 0, 100),
    humidityRetention: clamp(state.humidityRetention + humidityChange, 0, 100),
    airflowEfficiency: clamp(state.airflowEfficiency + (hasMaintenanceTasks ? -0.1 : 0.02), 0, 100),
    contaminationRisk: clamp(state.contaminationRisk + contaminationGrowth, 0, 100),
    operationalStress: clamp(state.operationalStress + stressFromDrift * 0.02 + stressDecay, 0, 100),
    energyEfficiency: clamp(state.energyEfficiency + (state.operationalStress > 50 ? -0.15 : 0.03), 0, 100),
    lastUpdated: now,
    healthScore: 0,
  }
}

/**
 * @deprecated Use computeTwinHealthScore from cultivation-profile.ts instead
 */
export function computeChamberHealth(state: ChamberTwinState, telemetry: { temperature: number; humidity: number; co2: number }): ChamberHealth {
  const thresholds = MODE_THRESHOLDS[state.mode]

  const thermalScore = scoreMetric(telemetry.temperature, thresholds.temperatureMin, thresholds.temperatureMax, thresholds.targetTemperature)
  const humidityScore = scoreMetric(telemetry.humidity, thresholds.humidityMin, thresholds.humidityMax, thresholds.targetHumidity)
  const airflowScore = Math.round(state.airflowEfficiency)
  const contaminationScore = Math.round(100 - state.contaminationRisk)
  const stressScore = Math.round(100 - state.operationalStress)
  const energyScore = Math.round(state.energyEfficiency)

  const weights = { thermal: 0.25, humidity: 0.2, airflow: 0.15, contamination: 0.15, stress: 0.15, energy: 0.1 }
  const overall = Math.round(
    thermalScore * weights.thermal +
    humidityScore * weights.humidity +
    airflowScore * weights.airflow +
    contaminationScore * weights.contamination +
    stressScore * weights.stress +
    energyScore * weights.energy
  )

  return {
    overallScore: clamp(overall, 0, 100),
    thermalScore,
    humidityScore,
    airflowScore,
    contaminationScore,
    stressScore,
    energyScore,
    mode: state.mode,
  }
}

export function switchOperationalMode(
  state: ChamberTwinState,
  newMode: OperationalMode
): ChamberTwinState {
  const now = new Date().toISOString()
  return {
    ...state,
    mode: newMode,
    modeStartedAt: now,
    lastUpdated: now,
    operationalStress: newMode === "emergency" ? state.operationalStress + 20 : state.operationalStress,
    contaminationRisk: newMode === "sterilization" ? 0 : state.contaminationRisk,
    growthCyclePhase: newMode === "incubation" ? "early-incubation" : newMode === "fruiting" ? "active-fruiting" : "standby",
  }
}
