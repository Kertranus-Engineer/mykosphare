import { describe, expect, it } from "vitest"
import { cloudHomeModels, createCloudHomeStore } from "../cloud-home"
import type { HomeResult } from "@/lib/grow/application/home-read"

const NOW = Date.parse("2026-10-21T12:00:00Z")
const ready: HomeResult = { status: "ready", chamber: { id: "chamber-a", name: "Principal" }, device: { id: "device-a", name: "ESP32", enabled: true, lastSeenAt: "2026-10-21T12:00:00Z" }, readings: [{ observedAt: "2026-10-21T12:00:00Z", temperature: 0, humidity: 80.3 }] }

describe("cloud HOME", () => {
  it("renders zero as a real value and no simulated fallback", () => {
    const view = cloudHomeModels({ result: ready, networkError: false, checkedAt: NOW }, NOW)
    expect(view.device.kind).toBe("live")
    expect(view.device.provenance).toBe("real")
    expect(view.environment.status).toBe("ready")
    if (view.environment.status === "ready") expect(view.environment.metrics[0].value).toBe(0)
  })

  it("shows an old real value as stale then offline, never current", () => {
    const state = { result: ready, networkError: false, checkedAt: NOW }
    expect(cloudHomeModels(state, NOW + 91_000).device.kind).toBe("stale")
    expect(cloudHomeModels(state, NOW + 301_000).device.kind).toBe("offline")
    const missing = cloudHomeModels({ result: { ...ready, readings: [] }, networkError: false, checkedAt: NOW }, NOW)
    expect(missing.environment.status).toBe("waiting")
  })

  it("clears cached owner readings on network failure and loss of permission", async () => {
    let response: Response = Response.json(ready)
    const store = createCloudHomeStore(undefined, async () => response, () => NOW)
    await store.refresh()
    response = Response.json({ status: "unavailable" }, { status: 503 })
    await store.refresh()
    expect(store.getSnapshot().networkError).toBe(true)
    expect(cloudHomeModels(store.getSnapshot(), NOW).environment.status).toBe("waiting")
    response = new Response("expired", { status: 401, headers: { "content-type": "text/plain" } })
    await store.refresh()
    expect(store.getSnapshot().result).toEqual({ status: "unauthorized" })
    expect(cloudHomeModels(store.getSnapshot(), NOW).environment.status).toBe("waiting")
  })
})
