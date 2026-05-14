import type { RuleDefinition, RuleEvaluationParams, EvaluationResult } from "./types"

const TEMP_HYSTERESIS = 1.5
const HUMIDITY_HYSTERESIS = 5
const CO2_HYSTERESIS = 30
const VARIANCE_SPIKE_FACTOR = 0.15
const HEARTBEAT_TIMEOUT_SEC = 300
const OFFLINE_GRACE_PERIOD_SEC = 600

const rulesRegistry = new Map<string, RuleDefinition>()

function register(rule: RuleDefinition): void {
  rulesRegistry.set(rule.id, rule)
}

register({
  id: "temp-high",
  name: "Temperature Too High",
  description: "Temperature exceeds target threshold",
  defaultSeverity: "warning",
  cooldownMs: 120_000,
  evaluate({ telemetry, settings }: RuleEvaluationParams): EvaluationResult {
    const val = telemetry.temperature
    const threshold = settings.targetTemperature
    if (val === null || val === undefined) return { triggered: false, title: "", description: "" }
    const triggered = val > threshold + TEMP_HYSTERESIS
    return {
      triggered,
      title: "Temperature Too High",
      description: `Temperature ${val.toFixed(1)}°C in Chamber Alpha exceeds target ${threshold}°C — affected node: MYK-CH-001 (chamber), system: environmental control`,
    }
  },
})

register({
  id: "temp-low",
  name: "Temperature Too Low",
  description: "Temperature drops below target threshold",
  defaultSeverity: "warning",
  cooldownMs: 120_000,
  evaluate({ telemetry, settings }: RuleEvaluationParams): EvaluationResult {
    const val = telemetry.temperature
    const threshold = settings.targetTemperature
    if (val === null || val === undefined) return { triggered: false, title: "", description: "" }
    const triggered = val < threshold - TEMP_HYSTERESIS
    return {
      triggered,
      title: "Temperature Too Low",
      description: `Temperature ${val.toFixed(1)}°C in Chamber Alpha below target ${threshold}°C — affected node: MYK-CH-001 (chamber), system: heating`,
    }
  },
})

register({
  id: "hum-high",
  name: "Humidity Too High",
  description: "Humidity exceeds target threshold",
  defaultSeverity: "warning",
  cooldownMs: 120_000,
  evaluate({ telemetry, settings }: RuleEvaluationParams): EvaluationResult {
    const val = telemetry.humidity
    const threshold = settings.targetHumidity
    if (val === null || val === undefined) return { triggered: false, title: "", description: "" }
    const triggered = val > threshold + HUMIDITY_HYSTERESIS
    return {
      triggered,
      title: "Humidity Too High",
      description: `Humidity ${val.toFixed(1)}% in Chamber Alpha exceeds target ${threshold}% — affected node: HUMIDIFIER-01 (relay), system: dehumidification`,
    }
  },
})

register({
  id: "hum-low",
  name: "Humidity Too Low",
  description: "Humidity drops below target threshold",
  defaultSeverity: "warning",
  cooldownMs: 120_000,
  evaluate({ telemetry, settings }: RuleEvaluationParams): EvaluationResult {
    const val = telemetry.humidity
    const threshold = settings.targetHumidity
    if (val === null || val === undefined) return { triggered: false, title: "", description: "" }
    const triggered = val < threshold - HUMIDITY_HYSTERESIS
    return {
      triggered,
      title: "Humidity Too Low",
      description: `Humidity ${val.toFixed(1)}% in Chamber Alpha below target ${threshold}% — affected node: HUMIDIFIER-01 (relay), system: misting subsystem`,
    }
  },
})

register({
  id: "co2-high",
  name: "CO₂ Too High",
  description: "CO₂ concentration exceeds target threshold",
  defaultSeverity: "warning",
  cooldownMs: 120_000,
  evaluate({ telemetry, settings }: RuleEvaluationParams): EvaluationResult {
    const val = telemetry.co2
    const threshold = settings.targetCo2
    if (val === null || val === undefined) return { triggered: false, title: "", description: "" }
    const triggered = val > threshold + CO2_HYSTERESIS
    return {
      triggered,
      title: "CO₂ Too High",
      description: `CO₂ ${val} ppm in Chamber Alpha exceeds target ${threshold} ppm — affected node: MH-Z19B (sensor), system: air exchange`,
    }
  },
})

register({
  id: "variance-spike",
  name: "Abnormal Variance Spike",
  description: "Sudden abnormal change in sensor readings",
  defaultSeverity: "warning",
  cooldownMs: 180_000,
  evaluate({ telemetry, previousTelemetry }: RuleEvaluationParams): EvaluationResult {
    if (!previousTelemetry) return { triggered: false, title: "", description: "" }

    const changes: string[] = []
    const metrics: [string, number | null, number | null][] = [
      ["Temperature", telemetry.temperature, previousTelemetry.temperature],
      ["Humidity", telemetry.humidity, previousTelemetry.humidity],
      ["CO₂", telemetry.co2, previousTelemetry.co2],
    ]

    for (const [name, current, previous] of metrics) {
      if (current === null || current === undefined || previous === null || previous === undefined) continue
      if (previous === 0) continue
      const change = Math.abs((current - previous) / previous)
      if (change > VARIANCE_SPIKE_FACTOR) {
        changes.push(`${name} ${(change * 100).toFixed(0)}% change`)
      }
    }

    if (changes.length === 0) return { triggered: false, title: "", description: "" }

    return {
      triggered: true,
      title: "Abnormal Variance Spike",
      description: `Sudden sensor variance in Chamber Alpha: ${changes.join(", ")} — affected nodes: SHT31 (sensors), system: telemetry integrity`,
    }
  },
})

register({
  id: "heartbeat-timeout",
  name: "Heartbeat Timeout",
  description: "Device heartbeat not received within expected interval",
  defaultSeverity: "critical",
  cooldownMs: 300_000,
  evaluate(): EvaluationResult {
    return { triggered: false, title: "", description: "" }
  },
})

register({
  id: "device-offline",
  name: "Device Offline",
  description: "Device has been unreachable for an extended period",
  defaultSeverity: "critical",
  cooldownMs: 600_000,
  evaluate(): EvaluationResult {
    return { triggered: false, title: "", description: "" }
  },
})

export const RULES: RuleDefinition[] = Array.from(rulesRegistry.values())

export function getRule(id: string): RuleDefinition | undefined {
  return rulesRegistry.get(id)
}

export function getRuleByTitle(title: string): RuleDefinition | undefined {
  return RULES.find((r) => r.name === title)
}

export function registerRule(rule: RuleDefinition): void {
  register(rule)
}

export { HEARTBEAT_TIMEOUT_SEC, OFFLINE_GRACE_PERIOD_SEC }
export type { RuleDefinition }
