import { describe, expect, it, vi } from "vitest"
import { getHomeReadings, type HomeRepository } from "../home-read"

function repository(): HomeRepository {
  return {
    findOwnedChamber: vi.fn(async owner => owner === "owner-a" ? { id: "chamber-a", name: "Principal" } : null),
    findDevice: vi.fn(async () => ({ id: "device-a", name: "ESP32", enabled: true, lastSeenAt: "2026-10-21T12:00:00Z" })),
    readings: vi.fn(async () => [{ observedAt: "2026-10-21T12:00:00Z", temperature: 20.7, humidity: 80.3 }]),
  }
}

describe("HOME owner reads", () => {
  it("never queries or returns another owner's sensor data", async () => {
    const repo = repository()
    expect(await getHomeReadings(repo, null)).toEqual({ status: "unauthorized" })
    expect(repo.findOwnedChamber).not.toHaveBeenCalled()
    expect(await getHomeReadings(repo, "owner-b", "chamber-a")).toEqual({ status: "not_found" })
    expect(repo.findDevice).not.toHaveBeenCalled()
    expect(repo.readings).not.toHaveBeenCalled()
  })

  it("returns persisted readings without a cultivation run", async () => {
    const repo = repository()
    const result = await getHomeReadings(repo, "owner-a")
    expect(result).toMatchObject({ status: "ready", chamber: { id: "chamber-a" }, readings: [{ temperature: 20.7, humidity: 80.3 }] })
    expect(repo.readings).toHaveBeenCalledWith("chamber-a", "device-a")
  })
})

describe("HOME intelligence context", () => {
  const profile = { id: "p1", displayName: "Sample", species: "Pleurotus ostreatus", validation: "sample" as const, stages: ["inoculation"] }

  it("adds history, cultivation and profiles only when available, and offers profiles when no crop is active", async () => {
    const repo = {
      ...repository(),
      history: vi.fn(async () => [{ observedAt: "2026-10-21T11:00:00Z", temperature: 20, humidity: 70 }]),
      activeCultivation: vi.fn(async () => null),
      profiles: vi.fn(async () => [profile]),
    }
    const plain = await getHomeReadings(repo, "owner-a")
    expect(plain).not.toHaveProperty("history")
    expect(plain).toMatchObject({ cultivation: null, profiles: [profile] })
    const withHistory = await getHomeReadings(repo, "owner-a", undefined, { includeHistory: true, now: new Date("2026-10-21T12:00:00Z") })
    expect(withHistory).toMatchObject({ history: [{ humidity: 70 }] })
    expect(repo.history).toHaveBeenCalledWith("chamber-a", "device-a", "2026-10-20T12:00:00.000Z")
  })

  it("never hides the real readings when the extra context fails", async () => {
    const repo = { ...repository(), history: vi.fn(async () => { throw new Error("boom") }), activeCultivation: vi.fn(async () => { throw new Error("boom") }) }
    const result = await getHomeReadings(repo, "owner-a", undefined, { includeHistory: true })
    expect(result).toMatchObject({ status: "ready", readings: [{ temperature: 20.7 }] })
    expect(result).not.toHaveProperty("history")
    expect(result).not.toHaveProperty("cultivation")
  })
})
