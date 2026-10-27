import { describe, expect, it } from "vitest"
import {
  buildCultivationTwin,
  createSampleOysterRun,
  deriveEnvironmentTransition,
  SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
  TWIN_LIMITS,
  type CultivationEvent,
  type EnvironmentalReading,
  type ReadingSample,
} from "@/lib/grow"
import { getCultivationTwin } from "@/lib/grow/application/service"
import type { TwinRepository } from "@/lib/grow/application/types"

const NOW = "2026-09-30T12:00:00.000Z"
const nowMs = new Date(NOW).getTime()
const iso = (msAgo: number) => new Date(nowMs - msAgo).toISOString()
const reading: EnvironmentalReading = { temperature: 22, humidity: 68, timestamp: iso(60_000), origin: "real", source: "grow-readings" }

function repo(overrides: Partial<TwinRepository> = {}): TwinRepository {
  return {
    getChamberForOwner: async (id, owner) => (id === "ch-1" && owner === "user-1" ? { id, ownerId: owner, name: "Box" } : null),
    getActiveRun: async () => ({ ...createSampleOysterRun(), status: "active" }),
    getSpeciesProfile: async () => SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
    getLatestReading: async () => reading,
    getInstalledCapabilities: async () => ["temperature", "humidity"],
    getRecentReadings: async () => [],
    getRecentEvents: async () => [],
    getStageHistory: async () => [{ stage: "colonization", confirmedAt: "2026-09-23T12:00:00.000Z", provenance: "manual" }],
    getLatestCapture: async () => null,
    ...overrides,
  }
}

describe("CultivationTwinSnapshot", () => {
  it("resolves the active run, latest reading, freshness and confirmed vs suggested stage", async () => {
    const result = await getCultivationTwin({ repository: repo(), chamberId: "ch-1", ownerId: "user-1", now: NOW })
    if (result.status !== "ready") throw new Error(result.status)
    const { twin } = result
    expect(twin.mode).toBe("real")
    expect(twin.run.status).toBe("active")
    expect(twin.latestObservation).toMatchObject({ reading: { temperature: 22 }, provenance: "sensor" })
    expect(twin.freshness).toBe("live")
    expect(twin.stage.confirmed).toMatchObject({ id: "colonization", confirmedAt: "2026-09-23T12:00:00.000Z", provenance: "manual" })
    expect(twin.stage.suggested).toEqual({ id: "consolidation", provenance: "deterministic" })
    expect(twin.grow.state.confirmedStage).toBe("colonization")
  })

  it("never resolves another owner's chamber and has explicit non-ready states", async () => {
    await expect(getCultivationTwin({ repository: repo(), chamberId: "ch-1", ownerId: "intruder", now: NOW })).resolves.toEqual({ status: "not_found" })
    await expect(getCultivationTwin({ repository: repo({ getActiveRun: async () => null }), chamberId: "ch-1", ownerId: "user-1", now: NOW })).resolves.toEqual({ status: "no_active_run" })
    await expect(getCultivationTwin({ repository: repo({ getRecentEvents: async () => { throw new Error("db") } }), chamberId: "ch-1", ownerId: "user-1", now: NOW })).resolves.toEqual({ status: "unavailable" })
  })

  it("real mode without readings stays unknown/offline — never simulated", async () => {
    const result = await getCultivationTwin({ repository: repo({ getLatestReading: async () => null }), chamberId: "ch-1", ownerId: "user-1", now: NOW })
    if (result.status !== "ready") throw new Error(result.status)
    expect(result.twin.latestObservation).toBeNull()
    expect(result.twin.grow.state.freshness).toBe("unknown")
    expect(result.twin.grow.reading).toBeNull()
    expect(result.twin.capabilities.every((c) => c.value === null)).toBe(true)
  })

  it("simulation is explicit, marked simulation, and carries no persisted memory", async () => {
    const result = await getCultivationTwin({ repository: repo({ getRecentEvents: async () => { throw new Error("must not be read") } }), chamberId: "ch-1", ownerId: "user-1", now: NOW, mode: "simulation" })
    if (result.status !== "ready") throw new Error(result.status)
    expect(result.twin.mode).toBe("simulation")
    expect(result.twin.latestObservation?.provenance).toBe("simulation")
    expect(result.twin.stage.confirmed.provenance).toBe("simulation")
    expect(result.twin.memory).toEqual({ recentReadings: [], recentEvents: [], stageHistory: [], latestCapture: null })
  })

  it("bounds memory explicitly (events, readings window, stage history)", () => {
    const events: CultivationEvent[] = Array.from({ length: 50 }, (_, i) => ({ id: `e${i}`, type: "stage_confirmed", occurredAt: iso(i * 60_000), provenance: "manual" }))
    const readings: ReadingSample[] = Array.from({ length: 400 }, (_, i) => ({ observedAt: iso(i * 5 * 60_000), temperature: 22, provenance: "sensor" }))
    const twin = buildCultivationTwin({
      mode: "real", run: createSampleOysterRun(), profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, latestReading: reading,
      installedCapabilities: ["temperature"], recentEvents: events, recentReadings: readings,
      stageHistory: Array.from({ length: 30 }, (_, i) => ({ stage: "colonization", confirmedAt: iso(i * 1000), provenance: "manual" as const })),
      now: NOW,
    })
    expect(twin.memory.recentEvents).toHaveLength(TWIN_LIMITS.recentEvents)
    expect(twin.memory.recentEvents[0].id).toBe("e0")
    expect(twin.memory.recentReadings.length).toBeLessThanOrEqual(TWIN_LIMITS.recentReadings)
    expect(twin.memory.recentReadings.every((r) => nowMs - new Date(r.observedAt).getTime() <= TWIN_LIMITS.recentReadingsWindowMs)).toBe(true)
    expect(twin.memory.stageHistory).toHaveLength(TWIN_LIMITS.stageHistory)
  })

  it("carries latest capture metadata and derives vision availability from it", () => {
    const capture = { id: "cap-1", capturedAt: iso(10 * 60_000), provenance: "sensor" as const, storagePath: "snapshots/ch-1/x.jpg" }
    const twin = buildCultivationTwin({ mode: "real", run: createSampleOysterRun(), profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, latestReading: reading, installedCapabilities: ["vision"], latestCapture: capture, now: NOW })
    expect(twin.memory.latestCapture).toEqual(capture)
    expect(twin.capabilities.find((c) => c.key === "vision")).toMatchObject({ installed: true, available: true, observed: false, value: null })
  })
})

describe("environment events are transitions, not telemetry", () => {
  it("emits only on healthy ↔ problem transitions and never around unknown", () => {
    expect(deriveEnvironmentTransition("healthy", "attention")).toBe("environment_attention")
    expect(deriveEnvironmentTransition("critical", "healthy")).toBe("environment_recovered")
    expect(deriveEnvironmentTransition("healthy", "healthy")).toBeNull()
    expect(deriveEnvironmentTransition("attention", "critical")).toBeNull()
    expect(deriveEnvironmentTransition("unknown", "healthy")).toBeNull()
    expect(deriveEnvironmentTransition("healthy", "unknown")).toBeNull()
    expect(deriveEnvironmentTransition(null, "attention")).toBeNull()
  })
})
