import { afterEach, describe, expect, it, vi } from "vitest"
import { buildGrowSnapshot, createSampleOysterRun, SAMPLE_PLEUROTUS_OSTREATUS_PROFILE } from "@/lib/grow"
import { growQueryString, parseGrowRequest } from "../data/grow-request"
import { createGrowStore } from "../data/grow-store"
import { fetchRealGrowView, type GrowView } from "../data/grow-view"

const q = (query: string) => parseGrowRequest(new URLSearchParams(query))

describe("URL request parsing", () => {
  it("requires an explicit opt-in for simulation", () => {
    expect(q("")).toEqual({ kind: "unconfigured" })
    expect(q("mode=real")).toEqual({ kind: "unconfigured" })
    expect(q("mode=simulation")).toEqual({ kind: "simulation", scenario: "stable", stage: null, notices: [] })
  })

  it("parses valid demo scenarios and stages", () => {
    expect(q("mode=simulation&scenario=dry")).toMatchObject({ kind: "simulation", scenario: "dry" })
    expect(q("mode=simulation&scenario=offline&stage=fruiting")).toMatchObject({ scenario: "offline", stage: "fruiting" })
  })

  it("unknown demo values fall back explicitly with a visible notice", () => {
    const request = q("mode=simulation&scenario=bogus&stage=nope")
    expect(request).toMatchObject({ kind: "simulation", scenario: "stable", stage: null })
    expect(request.kind === "simulation" && request.notices).toHaveLength(2)
  })

  it("unknown modes and malformed chamber ids are invalid, not simulation", () => {
    expect(q("mode=demo")).toEqual({ kind: "invalid" })
    expect(q("chamber=../../etc")).toEqual({ kind: "invalid" })
  })

  it("real mode needs a chamber; simulation ignores chamber params", () => {
    expect(q("chamber=abc-123")).toEqual({ kind: "real", chamberId: "abc-123" })
    expect(q("mode=simulation&chamber=abc-123").kind).toBe("simulation")
  })

  it("builds a canonical query that drops unknown params", () => {
    expect(growQueryString(q("mode=simulation&scenario=hot&x=1"))).toBe("?mode=simulation&scenario=hot")
    expect(growQueryString(q("chamber=abc&x=1"))).toBe("?chamber=abc")
    expect(growQueryString(q(""))).toBe("")
  })
})

const readySnapshot = buildGrowSnapshot({
  run: createSampleOysterRun(),
  profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
  reading: { temperature: 22, humidity: 68, timestamp: "2026-09-30T11:59:00.000Z", origin: "real", source: "test" },
  now: "2026-09-30T12:00:00.000Z",
})

function respond(status: number, body: unknown): typeof fetch {
  return (async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })) as typeof fetch
}

function expectNotSimulated(view: GrowView) {
  expect(view.mode).toBe("real")
  if (view.status === "ready") expect(view.mode).not.toBe("simulation")
}

describe("real mode never falls back to simulation", () => {
  it("maps each failure to its own explicit state", async () => {
    const cases: Array<[typeof fetch, GrowView["status"]]> = [
      [(async () => { throw new TypeError("offline") }) as typeof fetch, "network_error"],
      [respond(401, { error: "unauthorized" }), "unauthorized"],
      [respond(404, { status: "not_found" }), "not_found"],
      [respond(409, { status: "no_active_run" }), "no_active_run"],
      [respond(409, { status: "profile_missing" }), "profile_missing"],
      [respond(503, { status: "unavailable" }), "unavailable"],
      [respond(500, "<html>boom</html>"), "unavailable"],
      [respond(200, { status: "ready", snapshot: { nope: true } }), "unavailable"],
    ]
    for (const [fetchImpl, expected] of cases) {
      const view = await fetchRealGrowView("abc", { fetchImpl })
      expect(view.status).toBe(expected)
      expectNotSimulated(view)
    }
  })

  it("accepts a valid snapshot as real, with no invented timeline", async () => {
    const view = await fetchRealGrowView("abc", { fetchImpl: respond(200, { status: "ready", snapshot: readySnapshot }) })
    expect(view).toMatchObject({ status: "ready", mode: "real", timeline: [] })
  })

  it("the store surfaces a network failure instead of simulated data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline") }))
    const store = createGrowStore({ kind: "real", chamberId: "abc" })
    expect(store.getSnapshot()).toEqual({ status: "loading", mode: "real" })
    const unsubscribe = store.subscribe(() => undefined)
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe("network_error"))
    expect(store.getSnapshot().mode).toBe("real")
    unsubscribe()
  })

  it("the simulation store is simulated from the first computed view", () => {
    const store = createGrowStore({ kind: "simulation", scenario: "dry", stage: null, notices: [] })
    const unsubscribe = store.subscribe(() => undefined)
    const view = store.getSnapshot()
    expect(view).toMatchObject({ status: "ready", mode: "simulation" })
    unsubscribe()
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})
