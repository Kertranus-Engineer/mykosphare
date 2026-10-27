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
