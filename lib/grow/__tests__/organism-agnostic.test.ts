import { describe, expect, it } from "vitest"
import {
  buildCultivationTwin,
  buildGrowSnapshot,
  createSampleOysterRun,
  FUNGAL_STAGE_DEFINITIONS,
  mykoFormForStage,
  profileStages,
  provenanceOfOrigin,
  resolveCapabilities,
  SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
  suggestStageByDays,
  suggestStageFromProfile,
  type CultivationRun,
  type EnvironmentalReading,
} from "@/lib/grow"
import { presentStageJourney, stageLabel } from "@/lib/grow/presentation"
import { TEST_FIXTURE_FLOWERING_PLANT } from "./fixtures/flowering-plant.fixture"

const NOW = "2026-09-30T12:00:00.000Z"
const reading: EnvironmentalReading = { temperature: 22, humidity: 68, timestamp: NOW, origin: "real", source: "test" }

describe("Pleurotus behaviour is unchanged", () => {
  it("keeps the fungal stage table, day suggestions and MYKO form mapping", () => {
    expect(profileStages(SAMPLE_PLEUROTUS_OSTREATUS_PROFILE)).toBe(FUNGAL_STAGE_DEFINITIONS)
    expect([0, 3, 8, 12, 16, 22, 40].map(suggestStageByDays)).toEqual(["inoculation", "colonization", "consolidation", "primordia", "fruiting", "harvest", "harvest"])
    expect(["inoculation", "colonization", "consolidation", "primordia", "fruiting", "harvest"].map((s) => mykoFormForStage(s, SAMPLE_PLEUROTUS_OSTREATUS_PROFILE)))
      .toEqual(["early", "early", "early", "emerging", "mature", "complete"])
  })

  it("evaluates the sample Pleurotus run exactly as before", () => {
    const snapshot = buildGrowSnapshot({ run: createSampleOysterRun(), profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, reading, now: NOW })
    expect(snapshot.state).toMatchObject({ confirmedStage: "colonization", suggestedStage: "consolidation", health: "healthy", freshness: "live" })
    expect(snapshot.myko).toMatchObject({ form: "early", mood: "content" })
    expect(snapshot.myko.morphology).toBeUndefined()
  })
})

describe("a non-fungal organism needs no core rewrite (TEST FIXTURE profile)", () => {
  const plantRun: CultivationRun = { id: "fixture-run", speciesProfileId: TEST_FIXTURE_FLOWERING_PLANT.id, startedAt: "2026-08-16T12:00:00.000Z", confirmedStage: "vegetative" }

  it("declares its own stages, suggestions and MYKO mapping", () => {
    expect(profileStages(TEST_FIXTURE_FLOWERING_PLANT).map((s) => s.id)).toEqual(["germination", "vegetative", "flowering", "fruiting"])
    expect(suggestStageFromProfile(TEST_FIXTURE_FLOWERING_PLANT, 45)).toBe("flowering")
    expect(mykoFormForStage("flowering", TEST_FIXTURE_FLOWERING_PLANT)).toBe("mature")
  })

  it("builds a snapshot and a twin with its own targets and capabilities", () => {
    const twin = buildCultivationTwin({ mode: "real", run: plantRun, profile: TEST_FIXTURE_FLOWERING_PLANT, latestReading: reading, installedCapabilities: ["temperature", "humidity"], now: NOW })
    expect(twin.organism).toMatchObject({ kind: "flowering_plant", morphology: "flowering_plant" })
    expect(twin.stage.confirmed).toMatchObject({ id: "vegetative", known: true })
    expect(twin.stage.suggested?.id).toBe("flowering")
    expect(twin.grow.state.health).toBe("healthy")
    expect(twin.grow.myko).toMatchObject({ form: "emerging", morphology: "flowering_plant" })
    const light = twin.capabilities.find((c) => c.key === "light")
    expect(light).toMatchObject({ supported: true, installed: false, available: false, observed: false, value: null })
  })

  it("presents its stages without mushroom copy and without crashing on unknown ids", () => {
    expect(stageLabel("flowering", TEST_FIXTURE_FLOWERING_PLANT)).toBe("Flowering")
    const journey = presentStageJourney("vegetative", "flowering", TEST_FIXTURE_FLOWERING_PLANT)
    expect(journey.steps.map((s) => s.stage)).toEqual(["germination", "vegetative", "flowering", "fruiting"])
    expect(journey.current).toMatchObject({ stage: "vegetative", label: "Vegetative" })
    expect(stageLabel("unheard_of_stage")).toBe("unheard_of_stage")
  })

  it("an arbitrary stage id the profile does not declare does not break the twin", () => {
    const odd = { ...plantRun, confirmedStage: "mystery_stage" }
    const twin = buildCultivationTwin({ mode: "real", run: odd, profile: TEST_FIXTURE_FLOWERING_PLANT, latestReading: reading, installedCapabilities: [], now: NOW })
    expect(twin.stage.confirmed).toMatchObject({ id: "mystery_stage", known: false })
    expect(twin.grow.state.health).toBe("unknown")
    expect(twin.grow.myko.form).toBe("early")
  })
})

describe("capabilities: supported ≠ installed ≠ available ≠ observed", () => {
  it("never turns a missing observation into zero", () => {
    const statuses = resolveCapabilities({ profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, installed: ["temperature", "humidity"], reading: { ...reading, humidity: undefined }, freshness: "live" })
    expect(statuses.find((s) => s.key === "temperature")).toMatchObject({ installed: true, available: true, observed: true, value: 22 })
    expect(statuses.find((s) => s.key === "humidity")).toMatchObject({ installed: true, available: true, observed: false, value: null })
    expect(statuses.find((s) => s.key === "co2")).toMatchObject({ supported: true, installed: false, available: false, value: null })
  })

  it("an installed sensor whose device is offline is unavailable, not zero", () => {
    const statuses = resolveCapabilities({ profile: null, installed: ["temperature"], reading, freshness: "offline" })
    expect(statuses.find((s) => s.key === "temperature")).toMatchObject({ installed: true, available: false, observed: false, value: null })
  })

  it("vision is available only with a recent capture, and never carries a value", () => {
    const off = resolveCapabilities({ profile: null, installed: ["vision"], reading, freshness: "live" })
    const on = resolveCapabilities({ profile: null, installed: ["vision"], reading, freshness: "live", captureFresh: true })
    expect(off.find((s) => s.key === "vision")).toMatchObject({ available: false, value: null })
    expect(on.find((s) => s.key === "vision")).toMatchObject({ available: true, observed: false, value: null })
  })
})

describe("provenance", () => {
  it("maps origins without collapsing categories", () => {
    expect(provenanceOfOrigin("real")).toBe("sensor")
    expect(provenanceOfOrigin("simulated")).toBe("simulation")
    const twin = buildCultivationTwin({ mode: "real", run: createSampleOysterRun(), profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, latestReading: reading, installedCapabilities: ["temperature"], now: NOW })
    expect(twin.latestObservation?.provenance).toBe("sensor")
    expect(twin.stage.suggested?.provenance).toBe("deterministic")
    expect(twin.stage.confirmed.provenance).toBe("manual")
  })
})
