import { adaptSimulatedTelemetry } from "./adapters/telemetry"
import type { EnvironmentalReading } from "./types"

export type SampleSimulationScenario = "stable" | "dry" | "humid" | "cold" | "hot" | "offline"

const SAMPLE_VALUES: Record<Exclude<SampleSimulationScenario, "offline">, { temperature: number; humidity: number }> = {
  stable: { temperature: 22, humidity: 68 },
  dry: { temperature: 22, humidity: 50 },
  humid: { temperature: 22, humidity: 82 },
  cold: { temperature: 18, humidity: 68 },
  hot: { temperature: 27, humidity: 68 },
}

/** Deterministic development/demo input, not a physical or biological simulation. */
export function createSampleSimulationReading(input: {
  scenario: SampleSimulationScenario
  now: string | Date
  deviceId?: string
}): EnvironmentalReading | null {
  if (input.scenario === "offline") return null
  const time = new Date(input.now).getTime()
  if (!Number.isFinite(time)) return null
  const timestamp = new Date(time).toISOString()
  const values = SAMPLE_VALUES[input.scenario]
  return adaptSimulatedTelemetry({ ...values, timestamp, deviceId: input.deviceId })
}
