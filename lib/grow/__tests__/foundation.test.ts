import { describe, expect, it } from "vitest"
import {
  adaptEsp32Telemetry,
  adaptLegacyApiData,
  buildGrowSnapshot,
  createSampleOysterRun,
  createSampleSimulationReading,
  DEFAULT_FRESHNESS_POLICY,
  evaluateFreshness,
  evaluateGrowState,
  SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
  suggestStageForRun,
  toMykoViewModel,
  type EnvironmentalReading,
  type SpeciesProfile,
} from "@/lib/grow"

const NOW = "2026-09-30T12:00:00.000Z"
const RUN = createSampleOysterRun()

function realReading(overrides: Partial<EnvironmentalReading> = {}): EnvironmentalReading {
  return {
    temperature: 22,
    humidity: 68,
    timestamp: "2026-09-30T11:59:00.000Z",
    origin: "real",
    source: "test-esp32",
    deviceId: "ESP32-001",
    ...overrides,
  }
}

function state(reading: EnvironmentalReading | null, profile: SpeciesProfile = SAMPLE_PLEUROTUS_OSTREATUS_PROFILE) {
  return evaluateGrowState({ run: RUN, profile, reading, now: NOW })
}

describe("provenance and adapters", () => {
  it("preserves real ESP32 provenance, timestamp, device and only measured metrics", () => {
    const reading = adaptEsp32Telemetry({
      temp: 22.4,
      hum: 67.8,
      timestamp: "2026-09-30T11:59:00.000Z",
      deviceId: "ESP32-001",
      co2: 400,
      energy: 1.2,
    })
    expect(reading).toEqual({
      temperature: 22.4,
      humidity: 67.8,
      timestamp: "2026-09-30T11:59:00.000Z",
      origin: "real",
      source: "esp32",
      deviceId: "ESP32-001",
    })
    expect(reading).not.toHaveProperty("co2")
    expect(reading).not.toHaveProperty("energy")
  })

  it("bridges only live legacy API data and rejects simulated/unknown legacy responses", () => {
    expect(adaptLegacyApiData({ temp: 22, hum: 68, serverReceivedAt: NOW, source: "live" })).toMatchObject({ origin: "real" })
    expect(adaptLegacyApiData({ temp: 22, hum: 68, serverReceivedAt: NOW, source: "simulated" })).toBeNull()
  })

  it("retains partial ESP32 readings without inventing a missing metric", () => {
    const reading = adaptEsp32Telemetry({ temp: 22, timestamp: NOW })
    expect(reading).toMatchObject({ temperature: 22, origin: "real" })
    expect(reading).not.toHaveProperty("humidity")
  })
})

describe("partial and unknown data", () => {
  it("marks temperature-only and humidity-only input as partial, never healthy", () => {
    const onlyTemperature = state(realReading({ humidity: undefined }))
    const onlyHumidity = state(realReading({ temperature: undefined }))
    expect(onlyTemperature.conditions.temperature.status).toBe("ok")
    expect(onlyTemperature.conditions.humidity.status).toBe("unknown")
    expect(onlyTemperature.dataStatus).toBe("partial")
    expect(onlyTemperature.health).toBe("unknown")
    expect(onlyHumidity.dataStatus).toBe("partial")
    expect(onlyHumidity.health).toBe("unknown")
  })

  it("marks zero available metrics and absent reading as insufficient", () => {
    const noMetrics = state(realReading({ temperature: undefined, humidity: undefined }))
    const noReading = state(null)
    expect(noMetrics.dataStatus).toBe("insufficient")
    expect(noMetrics.health).toBe("unknown")
    expect(noReading.dataStatus).toBe("insufficient")
    expect(noReading.health).toBe("unknown")
  })

  it("does not claim health from a profile missing a required target", () => {
    const incomplete: SpeciesProfile = {
      ...SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
      stageTargets: { colonization: { temperature: { min: 20, max: 24 } } },
    }
    const result = state(realReading(), incomplete)
    expect(result.dataStatus).toBe("insufficient")
    expect(result.health).toBe("unknown")
    expect(result.needs[0]).toMatchObject({ kind: "profile_missing" })
  })
})

describe("freshness boundaries", () => {
  const observed = "2026-09-30T12:00:00.000Z"
  const staleAt = new Date(new Date(observed).getTime() + DEFAULT_FRESHNESS_POLICY.staleAfterMs).toISOString()
  const offlineAt = new Date(new Date(observed).getTime() + DEFAULT_FRESHNESS_POLICY.offlineAfterMs).toISOString()

  it("has explicit live, stale, offline and unknown boundaries", () => {
    expect(evaluateFreshness(observed, new Date(new Date(staleAt).getTime() - 1))).toBe("live")
    expect(evaluateFreshness(observed, staleAt)).toBe("stale")
    expect(evaluateFreshness(observed, offlineAt)).toBe("offline")
    expect(evaluateFreshness(observed, new Date(new Date(offlineAt).getTime() + 1))).toBe("offline")
    expect(evaluateFreshness(undefined, NOW)).toBe("unknown")
  })
})

describe("stages and snapshot composition", () => {
  it("keeps a confirmed stage when the suggestion differs or is unavailable", () => {
    const result = state(realReading())
    expect(result.confirmedStage).toBe("colonization")
    expect(result.suggestedStage).toBe("consolidation")
    expect(suggestStageForRun("not-a-date", NOW)).toBeNull()
    expect(RUN.confirmedStage).toBe("colonization")
  })

  it("builds one coherent, deterministic UI-facing snapshot", () => {
    const input = { run: RUN, profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, reading: realReading(), now: NOW }
    const first = buildGrowSnapshot(input)
    const second = buildGrowSnapshot(input)
    expect(first).toEqual(second)
    expect(first.myko.origin).toBe("real")
    expect(first.state.run).toBe(first.run)
  })
})

describe("deterministic simulation boundary", () => {
  it.each([
    ["stable", "healthy"],
    ["dry", "attention"],
    ["humid", "attention"],
    ["cold", "attention"],
    ["hot", "attention"],
  ] as const)("provides a deterministic %s scenario", (scenario, health) => {
    const first = createSampleSimulationReading({ scenario, now: NOW, deviceId: "SIM-001" })
    const second = createSampleSimulationReading({ scenario, now: NOW, deviceId: "SIM-001" })
    expect(first).toEqual(second)
    expect(first).toMatchObject({ origin: "simulated", source: "grow-simulator" })
    expect(state(first).health).toBe(health)
  })

  it("represents offline as no reading, not fake zero metrics", () => {
    expect(createSampleSimulationReading({ scenario: "offline", now: NOW })).toBeNull()
  })
})

describe("MYKO model invariants", () => {
  it("maps stage and semantic state without taking ownership of sensor logic", () => {
    expect(toMykoViewModel(state(realReading()))).toMatchObject({ form: "early", mood: "content" })
    expect(toMykoViewModel(state(realReading({ humidity: 50 })))).toMatchObject({ mood: "concerned", attention: "notice" })
    expect(toMykoViewModel(state(realReading({ temperature: 29 })))).toMatchObject({ mood: "distressed", attention: "urgent" })
  })

  it("keeps simulated provenance and uncertainty visible to MYKO", () => {
    const simulated = createSampleSimulationReading({ scenario: "stable", now: NOW })!
    const stale = state(realReading({ timestamp: "2026-09-30T11:50:00.000Z" }))
    expect(toMykoViewModel(state(simulated))).toMatchObject({ origin: "simulated", messageKey: "myko.status.simulated" })
    expect(toMykoViewModel(stale)).toMatchObject({ mood: "uncertain", messageKey: "myko.status.stale" })
  })
})
