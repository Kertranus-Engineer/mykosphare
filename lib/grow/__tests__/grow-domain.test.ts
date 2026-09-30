import { describe, expect, it } from "vitest"
import {
  evaluateFreshness,
  evaluateGrowState,
  suggestStageByDays,
  toMykoViewModel,
  type CultivationRun,
  type EnvironmentalReading,
  type SpeciesProfile,
} from "@/lib/grow"

const NOW = "2026-09-30T12:00:00.000Z"

// SAMPLE only: values exercise domain boundaries; they are not cultivation advice.
const SAMPLE_PROFILE: SpeciesProfile = {
  id: "sample-pleurotus-ostreatus",
  commonName: "Sample oyster mushroom",
  scientificName: "Pleurotus ostreatus",
  kind: "sample",
  stageTargets: {
    colonization: {
      temperature: { min: 20, max: 24, criticalMin: 16, criticalMax: 28 },
      humidity: { min: 60, max: 75, criticalMin: 45, criticalMax: 90 },
    },
  },
}

const RUN: CultivationRun = {
  id: "run-1",
  speciesProfileId: SAMPLE_PROFILE.id,
  startedAt: "2026-09-20T12:00:00.000Z",
  confirmedStage: "colonization",
}

function reading(overrides: Partial<EnvironmentalReading> = {}): EnvironmentalReading {
  return {
    temperature: 22,
    humidity: 68,
    timestamp: "2026-09-30T11:59:00.000Z",
    origin: "real",
    source: "test-device",
    ...overrides,
  }
}

function evaluate(overrides: Partial<EnvironmentalReading> = {}) {
  return evaluateGrowState({ run: RUN, profile: SAMPLE_PROFILE, reading: reading(overrides), now: NOW })
}

describe("Grow Domain", () => {
  it("evaluates a stable real cultivation", () => {
    const state = evaluate()
    expect(state.health).toBe("healthy")
    expect(state.freshness).toBe("live")
    expect(state.needs).toEqual([])
  })

  it.each([
    ["low temperature", { temperature: 19 }, "low", "attention"],
    ["high temperature", { temperature: 25 }, "high", "attention"],
    ["low humidity", { humidity: 59 }, "low", "attention"],
    ["high humidity", { humidity: 76 }, "high", "attention"],
  ] as const)("evaluates %s", (_name, input, condition, health) => {
    const state = evaluate(input)
    const metric = "temperature" in input ? state.conditions.temperature : state.conditions.humidity
    expect(metric.status).toBe(condition)
    expect(state.health).toBe(health)
  })

  it("preserves simultaneous problems as separate needs", () => {
    const state = evaluate({ temperature: 29, humidity: 44 })
    expect(state.health).toBe("critical")
    expect(state.needs.map((need) => need.kind)).toEqual([
      "temperature_attention",
      "humidity",
      "ventilation",
    ])
  })

  it("makes stale readings unknown rather than healthy", () => {
    const state = evaluate({ timestamp: "2026-09-30T11:50:00.000Z" })
    expect(state.freshness).toBe("stale")
    expect(state.health).toBe("unknown")
    expect(state.needs).toEqual([{ kind: "telemetry_stale", severity: "unknown" }])
  })

  it("makes offline readings unknown", () => {
    const state = evaluate({ timestamp: "2026-09-30T11:00:00.000Z" })
    expect(state.freshness).toBe("offline")
    expect(state.health).toBe("unknown")
    expect(state.needs).toEqual([{ kind: "telemetry_offline", severity: "unknown" }])
  })

  it("represents absence of reading as unknown", () => {
    const state = evaluateGrowState({ run: RUN, profile: SAMPLE_PROFILE, reading: null, now: NOW })
    expect(state.freshness).toBe("unknown")
    expect(state.health).toBe("unknown")
    expect(state.conditions.temperature.status).toBe("unknown")
    expect(state.origin).toBeNull()
  })

  it("preserves simulated origin", () => {
    const state = evaluate({ origin: "simulated" })
    expect(state.origin).toBe("simulated")
    expect(toMykoViewModel(state).messageKey).toBe("myko.status.simulated")
  })

  it("does not fabricate conditions for a confirmed stage missing from the profile", () => {
    const state = evaluateGrowState({
      run: { ...RUN, confirmedStage: "fruiting" },
      profile: SAMPLE_PROFILE,
      reading: reading(),
      now: NOW,
    })
    expect(state.health).toBe("unknown")
    expect(state.conditions.temperature.status).toBe("unknown")
    expect(state.needs).toEqual([{ kind: "profile_missing", severity: "unknown" }])
  })

  it("keeps an estimated stage separate from the confirmed stage", () => {
    const state = evaluate()
    expect(state.confirmedStage).toBe("colonization")
    expect(state.suggestedStage).toBe("consolidation")
    expect(suggestStageByDays(12)).toBe("primordia")
  })

  it("is deterministic for identical input", () => {
    expect(evaluate()).toEqual(evaluate())
  })
})

describe("freshness", () => {
  it("derives freshness entirely from timestamps and policy", () => {
    expect(evaluateFreshness("2026-09-30T11:59:00.000Z", NOW)).toBe("live")
    expect(evaluateFreshness("not-a-date", NOW)).toBe("unknown")
  })
})

describe("MYKO presentation", () => {
  it("represents healthy, attention and critical states", () => {
    expect(toMykoViewModel(evaluate()).mood).toBe("content")
    expect(toMykoViewModel(evaluate({ humidity: 59 })).mood).toBe("concerned")
    expect(toMykoViewModel(evaluate({ temperature: 29 })).mood).toBe("distressed")
  })

  it("represents stale, offline and unknown states as uncertain", () => {
    const stale = evaluate({ timestamp: "2026-09-30T11:50:00.000Z" })
    const offline = evaluate({ timestamp: "2026-09-30T11:00:00.000Z" })
    const unknown = evaluateGrowState({ run: RUN, profile: SAMPLE_PROFILE, reading: null, now: NOW })
    expect(toMykoViewModel(stale)).toMatchObject({ mood: "uncertain", messageKey: "myko.status.stale" })
    expect(toMykoViewModel(offline)).toMatchObject({ mood: "uncertain", messageKey: "myko.status.offline" })
    expect(toMykoViewModel(unknown)).toMatchObject({ mood: "uncertain", messageKey: "myko.status.unknown" })
  })
})
