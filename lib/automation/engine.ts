export interface ActuatorDecision {
  actuator: string
  command: string | null
  reason: string | null
}

export type RelayMode = "active_high" | "active_low"

const HYSTERESIS_COOLDOWN = 5000
const lastSent: Record<string, { command: string; time: number }> = {}
let relayMode: RelayMode = "active_high"

export function setRelayMode(mode: RelayMode) {
  relayMode = mode
}

export function getRelayMode(): RelayMode {
  return relayMode
}

const RULES = {
  fan: {
    onCondition: (temp: number) => temp > 28,
    offCondition: (temp: number) => temp < 26,
    criticalCondition: (temp: number) => temp > 32,
    emergencyCondition: (temp: number) => temp > 33,
    gpio: 19,
    label: "FAN",
  },
  humidifier: {
    onCondition: (_t: number, hum: number) => hum < 55,
    offCondition: (_t: number, hum: number) => hum > 70,
    criticalCondition: (_t: number, _h: number) => false,
    emergencyCondition: (_t: number, _h: number) => false,
    gpio: 17,
    label: "HUMIDIFIER",
  },
  heater: {
    onCondition: (temp: number) => temp < 22,
    offCondition: (temp: number) => temp > 24,
    criticalCondition: (_t: number) => false,
    emergencyCondition: (_t: number) => false,
    gpio: 32,
    label: "HEATER",
  },
} as const

export function evaluateAutomation(
  temp: number,
  hum: number
): ActuatorDecision[] {
  const decisions: ActuatorDecision[] = []
  const now = Date.now()
  const isEmergency = temp > 33

  for (const [key, rule] of Object.entries(RULES)) {
    const last = lastSent[key]

    let desiredCommand: string | null = null
    let reason: string | null = null

    if (isEmergency) {
      if (key === "fan") {
        if (!last || last.command !== "fan_on") {
          desiredCommand = "fan_on"
          reason = "EMERGENCY COOLING: FAN FORCE ON"
        }
      } else if (key === "heater") {
        if (!last || last.command !== "heater_off") {
          desiredCommand = "heater_off"
          reason = "EMERGENCY: HEATER FORCE OFF"
        }
      }
    } else {
      const isCritical = rule.criticalCondition(temp, hum)
      const shouldOn = rule.onCondition(temp, hum)
      const shouldOff = rule.offCondition(temp, hum)

      if (isCritical && key === "fan") {
        if (!last || last.command !== `${key}_on`) {
          desiredCommand = `${key}_on`
          reason = "CRITICAL: FAN FORCE ACTIVE"
        }
      } else if (key === "heater" && temp > 28) {
        if (!last || last.command !== "heater_off") {
          desiredCommand = "heater_off"
          reason = "HEATER DISABLED: TEMPERATURE ELEVATED"
        }
      } else if (shouldOn) {
        if (!last || last.command !== `${key}_on`) {
          desiredCommand = `${key}_on`
          reason = `${rule.label} SYSTEM ACTIVATED`
        } else if (now - last.time < HYSTERESIS_COOLDOWN) {
          continue
        }
      } else if (shouldOff) {
        if (!last || last.command !== `${key}_off`) {
          desiredCommand = `${key}_off`
          reason = `${rule.label} SYSTEM DEACTIVATED`
        } else if (now - last.time < HYSTERESIS_COOLDOWN) {
          continue
        }
      }
    }

    if (desiredCommand) {
      const opposite = desiredCommand.includes("_on")
        ? desiredCommand.replace("_on", "_off")
        : desiredCommand.replace("_off", "_on")
      if (last && last.command === opposite && now - last.time < HYSTERESIS_COOLDOWN) {
        continue
      }
      lastSent[key] = { command: desiredCommand, time: now }
      decisions.push({ actuator: key, command: desiredCommand, reason })
    }
  }

  return decisions
}

export function getGpioFor(actuator: string): number | null {
  const rule = RULES[actuator as keyof typeof RULES]
  return rule?.gpio ?? null
}

export function getLastSentCommand(actuator: string): string | null {
  return lastSent[actuator]?.command ?? null
}
