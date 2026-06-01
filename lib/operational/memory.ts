"use client"

const systemStartedAt = Date.now()
let lastIncidentAt: number | null = null
let incidentCount = 0
let criticalCount = 0
let peakTemp = 0
let fanActivations = 0
let lastFanActivation = 0
let thermalMomentum = 0
let stabilizationPhase: "domant" | "containment" | "thermal_stabilization" | "normalization" | "reconstruction" | "nominal" = "nominal"
let lastPhaseChange = Date.now()
let longestStableMs = 0
let lastStableSince: number | null = null

export function recordStablePeriod() {
  const now = Date.now()
  if (!lastStableSince) lastStableSince = now
  const duration = now - lastStableSince
  if (duration > longestStableMs) longestStableMs = duration
}

export function endStablePeriod() {
  lastStableSince = null
}

export function getInfrastructureTime() {
  const hoursStable = Math.floor(longestStableMs / 3600000)
  const minsStable = Math.floor((longestStableMs % 3600000) / 60000)
  const timeSinceFailure = lastIncidentAt
    ? Math.floor((Date.now() - lastIncidentAt) / 60000)
    : null

  return {
    longestStable: `${hoursStable}h ${minsStable}m`,
    timeSinceFailure: timeSinceFailure !== null ? `${timeSinceFailure}m` : null,
    autonomousRecoveries: autonomousCorrections,
    historicalTrauma: criticalCount > 2
      ? "Thermal instability persisted in operational memory"
      : criticalCount > 0 ? "Minor operational scarring present" : null,
    facilityInstinct: getOperationalParanoia() > 50
      ? "Survival-prioritizing behavior active"
      : getOperationalFatigue() > 30 ? "Conservative operational mode" : null,
    griefLevel: getFacilityHealth() < 30 ? "severe" : getFacilityHealth() < 50 ? "moderate" : "none",
  }
}

let autonomousCorrections = 0
let cumulativeStressHours = 0
let stressUpdateTimer = 0
let confidenceHistory: number[] = []

export function recordIncident(temp: number, isCritical: boolean) {
  incidentCount++
  if (isCritical) criticalCount++
  lastIncidentAt = Date.now()
  if (temp > peakTemp) peakTemp = temp
}

export function recordFanActivation() {
  fanActivations++
  lastFanActivation = Date.now()
  thermalMomentum = 100
}

export function recordConfidence(score: number) {
  confidenceHistory = [...confidenceHistory, score].slice(-20)
}

export function recordAutonomousCorrection() {
  autonomousCorrections++
}

export function updateThermalMomentum(temp: number, fanOn: boolean) {
  if (fanOn) {
    thermalMomentum = Math.max(0, thermalMomentum - 8)
  } else if (temp > 26) {
    thermalMomentum = Math.min(100, thermalMomentum + (temp - 26) * 5)
  } else {
    thermalMomentum = Math.max(0, thermalMomentum - 3)
  }
}

export function getThermalMomentum(): number {
  return thermalMomentum
}

export function updateStabilizationPhase(state: string, stress: number) {
  const now = Date.now()
  if (state === "CRITICAL" && stabilizationPhase !== "containment") {
    stabilizationPhase = "containment"
    lastPhaseChange = now
  } else if (state === "ESCALATION" && stabilizationPhase !== "thermal_stabilization" && stabilizationPhase === "containment") {
    stabilizationPhase = "thermal_stabilization"
    lastPhaseChange = now
  } else if (state === "RECOVERY" && stabilizationPhase !== "normalization") {
    stabilizationPhase = "normalization"
    lastPhaseChange = now
  } else if (state === "STABLE" && stabilizationPhase === "normalization" && (now - lastPhaseChange) > 10000) {
    stabilizationPhase = "reconstruction"
    lastPhaseChange = now
  } else if (state === "STABLE" && stabilizationPhase === "reconstruction" && (now - lastPhaseChange) > 15000 && stress < 20) {
    stabilizationPhase = "nominal"
    lastPhaseChange = now
  }
}

export function getStabilizationPhase(): typeof stabilizationPhase {
  return stabilizationPhase
}

export function getOperationalFatigue(): number {
  const now = Date.now()
  const elapsed = (now - stressUpdateTimer) / 3600000
  if (elapsed > 0.01) {
    cumulativeStressHours += computeStressIndex() * elapsed / 100
    stressUpdateTimer = now
  }
  return Math.round(Math.min(100, cumulativeStressHours * 2))
}

export function getFacilityHealth(): number {
  const fatigue = getOperationalFatigue()
  const currentStress = computeStressIndex()
  let health = 100
  health -= fatigue * 0.5
  health -= currentStress * 0.2
  health -= criticalCount * 2
  if (thermalMomentum > 50) health -= 5
  return Math.max(10, Math.round(health))
}

export function getFacilityPersonality(): "healthy" | "tired" | "damaged" {
  const health = getFacilityHealth()
  const fatigue = getOperationalFatigue()
  if (health < 35 || fatigue > 75) return "damaged"
  if (health < 65 || fatigue > 40) return "tired"
  return "healthy"
}

export function hasRecentIncident(withinMs = 300000): boolean {
  if (!lastIncidentAt) return false
  return Date.now() - lastIncidentAt < withinMs
}

export function getIncidentEchoIntensity(): number {
  if (!lastIncidentAt) return 0
  const elapsed = Date.now() - lastIncidentAt
  if (elapsed > 600000) return 0
  return Math.max(0, Math.round((1 - elapsed / 600000) * 100))
}

export function isMaintenanceCycle(): boolean {
  const health = getFacilityHealth()
  const fatigue = getOperationalFatigue()
  if (fatigue > 50 && autonomousCorrections > 3) return true
  if (health < 40 && autonomousCorrections > 0) return true
  return false
}

export function getFacilityReputation(): { label: string; color: string } {
  const health = getFacilityHealth()
  const stress = computeStressIndex()
  const successfulRecoveries = autonomousCorrections - criticalCount
  if (health > 80 && stress < 15) return { label: "RELIABLE", color: "text-emerald-500" }
  if (health > 50 && successfulRecoveries > criticalCount) return { label: "RESILIENT", color: "text-teal-500" }
  if (health < 40 || (criticalCount > 0 && successfulRecoveries < criticalCount)) return { label: "UNSTABLE", color: "text-red-500" }
  return { label: "DEGRADED", color: "text-amber-500" }
}

export function getLongSilenceLevel(): number {
  if (lastIncidentAt) return 0
  const hoursSinceStart = (Date.now() - systemStartedAt) / 3600000
  if (hoursSinceStart < 1) return 0
  return Math.min(100, Math.round(hoursSinceStart * 10))
}

export function getMemoryShadowIntensity(): number {
  let intensity = 0
  intensity += criticalCount * 5
  intensity += incidentCount * 2
  intensity += fanActivations * 1
  if (thermalMomentum > 50) intensity += 10
  return Math.min(100, intensity)
}

export function getRecoveryReliefLevel(): number {
  if (stabilizationPhase === "nominal") return 100
  if (stabilizationPhase === "reconstruction") return 60
  if (stabilizationPhase === "normalization") return 30
  if (stabilizationPhase === "thermal_stabilization") return 10
  return 0
}

export function getOperationalParanoia(): number {
  let paranoia = 0
  paranoia += criticalCount * 10
  if (lastIncidentAt && (Date.now() - lastIncidentAt) < 600000) paranoia += 20
  if (getFacilityHealth() < 50) paranoia += 15
  if (getOperationalFatigue() > 50) paranoia += 15
  return Math.min(100, paranoia)
}

export function isSelfPreservationActive(): boolean {
  return getFacilityHealth() < 50 || getOperationalFatigue() > 60 || criticalCount > 4
}

export function getAiDoubtLevel(): "confident" | "uncertain" | "hesitant" {
  const health = getFacilityHealth()
  if (health < 40) return "hesitant"
  if (health < 65) return "uncertain"
  return "confident"
}

export function computeStressIndex(): number {
  let stress = 0
  const now = Date.now()
  const hoursSinceStart = Math.max(1, (now - systemStartedAt) / 3600000)
  
  stress += criticalCount * 8
  stress += incidentCount * 3
  stress += Math.min(fanActivations / Math.max(1, hoursSinceStart) * 5, 15)
  
  if (lastIncidentAt && (now - lastIncidentAt) < 300000) stress += 10
  if (lastFanActivation && (now - lastFanActivation) < 60000) stress += 5
  
  const recentAvg = confidenceHistory.length > 0
    ? confidenceHistory.reduce((a, b) => a + b, 0) / confidenceHistory.length
    : 100
  if (recentAvg < 85) stress += 10
  if (recentAvg < 70) stress += 15
  
  return Math.max(0, Math.min(100, Math.round(stress)))
}

export function getAdaptiveFanThreshold(): number {
  const baseThreshold = 28
  const stress = computeStressIndex()
  if (criticalCount > 3) return baseThreshold - 2
  if (criticalCount > 1) return baseThreshold - 1
  if (stress > 50) return baseThreshold - 1
  return baseThreshold
}

export function getPredictiveWarning(temp: number, trend: string): string | null {
  if (temp > 26 && trend === "up") return "Thermal escalation probability increasing"
  if (temp > 30 && trend === "up") return "Critical threshold approaching — response ready"
  if (temp > 27 && computeStressIndex() > 60) return "Elevated thermal risk under current stress load"
  return null
}

export function getOperationalMood(): "calm" | "active" | "vigilant" | "critical" {
  const stress = computeStressIndex()
  if (stress > 70) return "critical"
  if (stress > 40) return "vigilant"
  if (stress > 15) return "active"
  return "calm"
}

export function getOperationalMemory() {
  const age = Math.floor((Date.now() - systemStartedAt) / 3600000)
  const lastIncidentAgo = lastIncidentAt
    ? Math.max(0, Math.floor((Date.now() - lastIncidentAt) / 60000))
    : null
  const stress = computeStressIndex()

  return {
    systemAge: `${age}h`,
    incidentCount,
    criticalCount,
    peakTemp: peakTemp > 0 ? `${peakTemp}°C` : null,
    lastIncidentAgo: lastIncidentAgo !== null ? `${lastIncidentAgo}m ago` : null,
    stressIndex: stress,
    stressLevel: stress > 60 ? "elevated" : stress > 30 ? "moderate" : "normal",
    adaptiveFan: getAdaptiveFanThreshold(),
    mood: getOperationalMood(),
    thermalMomentum,
    stabilizationPhase,
    autonomousCorrections,
    fatigue: getOperationalFatigue(),
    facilityHealth: getFacilityHealth(),
    facilityPersonality: getFacilityPersonality(),
    facilityReputation: getFacilityReputation(),
    selfPreservation: isSelfPreservationActive(),
    aiDoubt: getAiDoubtLevel(),
    recentIncident: hasRecentIncident(),
    incidentEcho: getIncidentEchoIntensity(),
    maintenanceCycle: isMaintenanceCycle(),
    longSilence: getLongSilenceLevel(),
    memoryShadow: getMemoryShadowIntensity(),
    recoveryRelief: getRecoveryReliefLevel(),
    paranoia: getOperationalParanoia(),
    infraTime: getInfrastructureTime(),
  }
}

export function useOperationalMemory() {
  return getOperationalMemory()
}
