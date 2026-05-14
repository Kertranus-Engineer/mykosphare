export type ScenarioType =
  | "none"
  | "humidity-drift"
  | "intermittent-heartbeat"
  | "co2-spike"
  | "device-offline"
  | "recovery-cycle"

export interface Scenario {
  type: ScenarioType
  label: string
  description: string
  severity: "info" | "warning" | "critical"
  remainingMs: number
  totalMs: number
}

interface ActiveScenario {
  type: ScenarioType
  startedAt: number
  durationMs: number
}

const SCENARIO_META: Record<string, Pick<Scenario, "label" | "description" | "severity">> = {
  "humidity-drift": {
    label: "Humidity Drift",
    description: "Simulating gradual humidity increase above optimal range",
    severity: "warning",
  },
  "intermittent-heartbeat": {
    label: "Intermittent Heartbeat Loss",
    description: "Simulating periodic heartbeat drops from edge devices",
    severity: "critical",
  },
  "co2-spike": {
    label: "CO₂ Spike",
    description: "Simulating sudden CO₂ concentration increase",
    severity: "warning",
  },
  "device-offline": {
    label: "Device Offline",
    description: "Simulating temporary device disconnection",
    severity: "critical",
  },
  "recovery-cycle": {
    label: "Recovery Cycle",
    description: "Simulating system returning to normal after anomaly",
    severity: "info",
  },
}

const SCENARIO_DURATION_MS = 30_000
const SCENARIO_COOLDOWN_MS = 20_000
const SCENARIO_ORDER: ScenarioType[] = [
  "humidity-drift",
  "co2-spike",
  "intermittent-heartbeat",
  "device-offline",
  "recovery-cycle",
]

let activeScenario: ActiveScenario | null = null
let scenarioIndex = 0
let lastScenarioEnd = 0
let demoOverride: ActiveScenario | null = null

export function getActiveScenario(now: number): Scenario | null {
  if (demoOverride) {
    const elapsed = now - demoOverride.startedAt
    if (elapsed >= demoOverride.durationMs) {
      demoOverride = null
      return null
    }
    const meta = SCENARIO_META[demoOverride.type]
    return {
      type: demoOverride.type,
      remainingMs: demoOverride.durationMs - elapsed,
      totalMs: demoOverride.durationMs,
      ...meta,
    }
  }

  if (activeScenario) {
    const elapsed = now - activeScenario.startedAt
    if (elapsed >= activeScenario.durationMs) {
      activeScenario = null
      lastScenarioEnd = now
      return null
    }
    const meta = SCENARIO_META[activeScenario.type]
    return {
      type: activeScenario.type,
      remainingMs: activeScenario.durationMs - elapsed,
      totalMs: activeScenario.durationMs,
      ...meta,
    }
  }

  if (now - lastScenarioEnd < SCENARIO_COOLDOWN_MS) return null

  const nextType = SCENARIO_ORDER[scenarioIndex % SCENARIO_ORDER.length]
  scenarioIndex++
  activeScenario = {
    type: nextType,
    startedAt: now,
    durationMs: SCENARIO_DURATION_MS,
  }
  const meta = SCENARIO_META[nextType]
  return {
    type: nextType,
    remainingMs: SCENARIO_DURATION_MS,
    totalMs: SCENARIO_DURATION_MS,
    ...meta,
  }
}

export function resetScenarios(): void {
  activeScenario = null
  scenarioIndex = 0
  lastScenarioEnd = 0
  demoOverride = null
}

export function setScenario(type: ScenarioType, durationMs: number = 30_000): void {
  demoOverride = {
    type,
    startedAt: Date.now(),
    durationMs,
  }
}

export function clearScenarioOverride(): void {
  demoOverride = null
}

export function applyScenarioEffects(
  current: { temp: number; hum: number; co2: number; energy: number },
  scenario: Scenario | null
): { temp: number; hum: number; co2: number; energy: number } {
  if (!scenario) return current

  switch (scenario.type) {
    case "humidity-drift": {
      const progress = 1 - scenario.remainingMs / scenario.totalMs
      const drift = Math.sin(progress * Math.PI) * 4
      return { ...current, hum: Math.min(70, Math.max(55, current.hum + drift * 0.3)) }
    }
    case "co2-spike": {
      const progress = 1 - scenario.remainingMs / scenario.totalMs
      const spike = Math.sin(progress * Math.PI) * 60
      return { ...current, co2: Math.min(520, Math.max(395, current.co2 + spike * 0.5)) }
    }
    case "intermittent-heartbeat":
    case "device-offline":
      return current
    case "recovery-cycle": {
      const progress = 1 - scenario.remainingMs / scenario.totalMs
      const recovery = 1 - Math.sin(progress * Math.PI) * 0.3
      return {
        ...current,
        temp: 24.5 + (current.temp - 24.5) * recovery,
        hum: 61 + (current.hum - 61) * recovery,
        co2: 420 + (current.co2 - 420) * recovery,
      }
    }
    default:
      return current
  }
}

export function shouldDropHeartbeat(
  deviceIndex: number,
  scenario: Scenario | null,
  now: number
): boolean {
  if (!scenario) return false
  if (scenario.type === "intermittent-heartbeat") {
    const phase = Math.sin(now * 0.003 + deviceIndex * 1.5)
    return phase > 0.7
  }
  if (scenario.type === "device-offline") {
    return deviceIndex === 0
  }
  return false
}
