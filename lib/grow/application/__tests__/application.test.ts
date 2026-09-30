import { describe, expect, it } from "vitest"
import { createSampleOysterRun, SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, type EnvironmentalReading } from "@/lib/grow"
import { getGrowSnapshot } from "../service"
import { validateDeviceReadingPayload } from "../validation"
import type { GrowRepository } from "../types"

const now = "2026-09-30T12:00:00.000Z"
const reading: EnvironmentalReading = { temperature: 22, humidity: 68, timestamp: now, origin: "real", source: "test", deviceId: "dev-1" }
function repo(overrides: Partial<GrowRepository> = {}): GrowRepository {
  return { getChamberForOwner: async () => ({ id: "ch-1", ownerId: "user-1", name: "Box" }), getActiveRun: async () => createSampleOysterRun(), getSpeciesProfile: async () => SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, getLatestReading: async () => reading, ...overrides }
}

describe("v2 device validation", () => {
  it("rejects invalid timestamps, empty metrics and forbidden derived/origin fields", () => {
    expect(validateDeviceReadingPayload({ deviceId: "d", observedAt: "bad", temperature: 20 })).toMatchObject({ ok: false })
    expect(validateDeviceReadingPayload({ deviceId: "d", observedAt: "2026-10-01T12:00:00.000Z", temperature: 20 }, now)).toMatchObject({ ok: false })
    expect(validateDeviceReadingPayload({ deviceId: "d", observedAt: now })).toMatchObject({ ok: false })
    expect(validateDeviceReadingPayload({ deviceId: "d", observedAt: now, co2: 400 })).toMatchObject({ ok: false })
    expect(validateDeviceReadingPayload({ deviceId: "d", observedAt: now, origin: "simulated", temperature: 20 })).toMatchObject({ ok: false })
  })
  it("accepts partial measured telemetry without creating absent metrics", () => {
    const result = validateDeviceReadingPayload({ deviceId: "d", observedAt: now, temperature: 20 })
    expect(result).toEqual({ ok: true, data: { deviceId: "d", observedAt: now, temperature: 20 } })
  })
})

describe("Grow application", () => {
  it("builds a real snapshot through a mockable repository", async () => {
    const result = await getGrowSnapshot({ repository: repo(), chamberId: "ch-1", ownerId: "user-1", now })
    expect(result).toMatchObject({ status: "ready", snapshot: { state: { origin: "real", health: "healthy" } } })
  })
  it("has explicit no-run, missing-profile, missing-reading and unavailable states", async () => {
    await expect(getGrowSnapshot({ repository: repo({ getActiveRun: async () => null }), chamberId: "ch-1", ownerId: "user-1", now })).resolves.toEqual({ status: "no_active_run" })
    await expect(getGrowSnapshot({ repository: repo({ getSpeciesProfile: async () => null }), chamberId: "ch-1", ownerId: "user-1", now })).resolves.toEqual({ status: "profile_missing" })
    const noReading = await getGrowSnapshot({ repository: repo({ getLatestReading: async () => null }), chamberId: "ch-1", ownerId: "user-1", now })
    expect(noReading).toMatchObject({ status: "ready", snapshot: { state: { health: "unknown" } } })
    await expect(getGrowSnapshot({ repository: repo({ getChamberForOwner: async () => { throw new Error("db") } }), chamberId: "ch-1", ownerId: "user-1", now })).resolves.toEqual({ status: "unavailable" })
  })
  it("keeps the explicitly requested simulation path simulated", async () => {
    const result = await getGrowSnapshot({ repository: repo(), chamberId: "ch-1", ownerId: "user-1", now, mode: "simulation" })
    expect(result).toMatchObject({ status: "ready", snapshot: { reading: { origin: "simulated" }, myko: { origin: "simulated" } } })
  })
})
