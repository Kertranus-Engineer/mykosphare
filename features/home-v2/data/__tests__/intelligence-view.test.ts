import { describe, expect, it } from "vitest"
import { buildIntelligenceView, targetsFromCultivation } from "../intelligence-view"
import { createCloudHomeStore, type CloudHomeState } from "../cloud-home"
import type { HomeCultivation, HomeReading, HomeResult } from "@/lib/grow/application/home-read"

const NOW = Date.parse("2026-10-27T18:00:00Z")
const STEP = 30_000
const series = (n: number, temperature: number, humidity: number): HomeReading[] =>
  Array.from({ length: n }, (_, i) => ({ observedAt: new Date(NOW - i * STEP).toISOString(), temperature, humidity }))

const cultivation: HomeCultivation = {
  runId: "run-1", name: "Mi cultivo", startedAt: "2026-10-26T12:00:00Z", stage: "fruiting",
  profile: { id: "p1", displayName: "Sample oyster mushroom", species: "Pleurotus ostreatus", validation: "sample", stages: ["inoculation", "fruiting"] },
  targets: { temperature: { min: 20, max: 24 }, humidity: { min: 60, max: 75 } },
}
const ready = (over: Partial<Extract<HomeResult, { status: "ready" }>> = {}): HomeResult => ({
  status: "ready", chamber: { id: "chamber-a", name: "Principal" },
  device: { id: "device-a", name: "MYKO-001", enabled: true, lastSeenAt: new Date(NOW).toISOString() },
  readings: series(20, 22, 68), ...over,
})
const state = (result: HomeResult | null, history: HomeReading[] | null = null): CloudHomeState => ({ result, networkError: false, checkedAt: NOW, history, historyAt: NOW })

describe("HOME intelligence view", () => {
  it("is null until the owner-scoped API answered with a chamber", () => {
    expect(buildIntelligenceView(state(null), NOW)).toBeNull()
    expect(buildIntelligenceView(state({ status: "unauthorized" }), NOW)).toBeNull()
    expect(buildIntelligenceView(state({ status: "unconfigured" }), NOW)).toBeNull()
  })

  it("asks to configure the crop when none exists and never invents a stage", () => {
    const view = buildIntelligenceView(state(ready({ cultivation: null, profiles: [{ id: "p1", displayName: "Sample oyster mushroom", species: "Pleurotus ostreatus", validation: "sample", stages: ["inoculation"] }] })), NOW)
    expect(view?.report.summary.headline).toContain("configures la etapa")
    expect(view?.targetsLabel).toBeNull()
    expect(view?.profiles).toHaveLength(1)
    expect(view?.report.primaryAction?.href).toBe("/home/cultivo")
  })

  it("evaluates real readings against the confirmed stage and labels the source of the targets", () => {
    const view = buildIntelligenceView(state(ready({ cultivation })), NOW)
    expect(view?.report.summary.headline).toBe("Todo está estable.")
    expect(view?.targetsLabel).toBe("Sample oyster mushroom · Fructificación")
    expect(targetsFromCultivation(cultivation)?.validation).toBe("sample")
  })

  it("turns an ongoing excursion into an active alert and a finished one into a past event", () => {
    const low = [...series(24, 22, 55), ...series(30, 22, 68).map((r, i) => ({ ...r, observedAt: new Date(NOW - (24 + i) * STEP).toISOString() }))]
    const view = buildIntelligenceView(state(ready({ cultivation, readings: low.slice(0, 120) })), NOW)
    expect(view?.report.findings.some(f => f.kind === "humidity_low")).toBe(true)
    const alert = view?.historyEntries.find(e => e.kind === "alert")
    expect(alert).toMatchObject({ at: null, tone: "warn", simulated: false })
    const finished = [...Array.from({ length: 12 }, (_, i): HomeReading => ({ observedAt: new Date(NOW - (3_600_000 - i * 300_000)).toISOString(), temperature: 22, humidity: 52 })),
      ...Array.from({ length: 12 }, (_, i): HomeReading => ({ observedAt: new Date(NOW - (3_600_000 - 3_600_000 / 2 + i * 300_000)).toISOString(), temperature: 22, humidity: 68 }))]
    const withHistory = buildIntelligenceView(state(ready({ cultivation }), finished), NOW)
    expect(withHistory?.historyEntries.some(e => e.kind === "event" && e.category === "environment")).toBe(true)
  })

  it("reports a disconnected device instead of evaluating old data, and never marks anything simulated", () => {
    const view = buildIntelligenceView(state(ready({ cultivation })), NOW + 10 * 60_000)
    expect(view?.report.summary.headline).toBe("MYKO-001 dejó de enviar mediciones.")
    expect(view?.historyEntries.every(e => e.simulated === false)).toBe(true)
  })
})

describe("cloud store history", () => {
  it("asks for the 24 h context first, keeps it between polls, and drops it on loss of permission", async () => {
    const urls: string[] = []
    let clock = NOW
    let response: Response = Response.json({ ...(ready() as object), history: series(3, 22, 68) })
    const store = createCloudHomeStore(undefined, async url => { urls.push(String(url)); return response }, () => clock)
    await store.refresh()
    expect(urls[0]).toContain("history=1")
    expect(store.getSnapshot().history).toHaveLength(3)
    response = Response.json(ready())
    clock += 30_000
    await store.refresh()
    expect(urls[1]).not.toContain("history=1")
    expect(store.getSnapshot().history).toHaveLength(3)
    clock += 5 * 60_000
    response = Response.json({ ...(ready() as object), history: series(4, 22, 68) })
    await store.refresh()
    expect(urls[2]).toContain("history=1")
    response = new Response("expired", { status: 401 })
    await store.refresh()
    expect(store.getSnapshot().history).toBeUndefined()
  })
})
