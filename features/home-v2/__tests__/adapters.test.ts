import { describe, expect, it } from "vitest"

import type { ActivityItem } from "@/features/mobile/use-mobile-activity"
import type { MobileTelemetry } from "@/features/mobile/use-mobile-telemetry"
import type { GrowRequest } from "@/features/grow/data/grow-request"
import type { GrowView } from "@/features/grow/data/grow-view"
import { buildDemoGrowComposition } from "@/lib/grow/demo/simulation-demo"
import { createSampleOysterRun, SAMPLE_PLEUROTUS_OSTREATUS_PROFILE } from "@/lib/grow"
import type { GrowTimelineEvent } from "@/lib/grow/timeline"
import {
  buildStageSteps,
  classifyCaptureError,
  resolveStagePlan,
  toCultivationModel,
  toDeviceModel,
  severityToTone,
  toEnvironmentModel,
  toHistoryEntries,
  toLog,
  toPhotosModel,
} from "../data/adapters"
import { buildDemoPhotos } from "../data/demo-frames"
import {
  DEMO_OFF,
  DEMO_STORAGE_KEY,
  demoFromUrl,
  effectiveGrowRequest,
  getDemoServerSnapshot,
  getDemoSnapshot,
  parseDemoState,
  resetDemoStoreForTests,
  serializeDemoState,
  setDemoState,
  subscribeDemo,
} from "../data/demo-mode"
import { assertNoSimulationOutsideDemo, resolveCultivation, resolvePhotos, resolveTelemetry } from "../data/resolve"
import { labHref, parseLabRequest } from "../data/lab-request"

function telemetry(overrides: Partial<MobileTelemetry> = {}): MobileTelemetry {
  const reading = { value: 23.4, trend: "stable" as const, delta: 0, status: "Nominal", statusColor: "" }
  return {
    source: "live",
    connection: { kind: "live", label: "En vivo" },
    dimmed: false,
    hasData: true,
    temperature: reading,
    humidity: { ...reading, value: 68.1 },
    fan: false,
    humidifier: true,
    co2: null,
    lastDeviceSampleAt: "2026-10-15T12:00:00.000Z",
    env: { state: "STABLE", alerts: [], chamberIndicators: [] } as unknown as MobileTelemetry["env"],
    envReady: true,
    history: [],
    ...overrides,
  }
}

const NOW = new Date("2026-10-15T12:00:00.000Z")

describe("environment adapter", () => {
  it("never invents values: connecting is loading, no device is disconnected", () => {
    expect(toEnvironmentModel(telemetry({ hasData: false, source: "none", connection: { kind: "connecting", label: "Conectando" } }))).toMatchObject({
      status: "waiting",
      reason: "loading",
      title: "Esperando lecturas",
    })
    expect(toEnvironmentModel(telemetry({ hasData: false, source: "none", connection: { kind: "offline", label: "Sin conexión" } }))).toMatchObject({
      status: "waiting",
      reason: "disconnected",
      title: "Sin dispositivo conectado",
    })
  })

  it("keeps a missing metric as null instead of zero", () => {
    const model = toEnvironmentModel(telemetry({ humidity: { value: null, trend: "stable", delta: 0, status: null, statusColor: "" } }))
    expect(model.status).toBe("ready")
    if (model.status !== "ready") return
    expect(model.metrics.find((m) => m.id === "humidity")?.value).toBeNull()
    expect(model.metrics.find((m) => m.id === "humidity")?.condition).toBeNull()
  })

  it("reports no trend until there are at least two samples", () => {
    const one = toEnvironmentModel(telemetry({ history: [{ time: "t", temperature: 23, humidity: 60 }] }))
    const two = toEnvironmentModel(
      telemetry({
        history: [
          { time: "t1", temperature: 23, humidity: 60 },
          { time: "t2", temperature: 23.4, humidity: 60 },
        ],
        temperature: { value: 23.4, trend: "up", delta: 0.4, status: "Nominal", statusColor: "" },
      }),
    )
    if (one.status !== "ready" || two.status !== "ready") throw new Error("expected ready")
    expect(one.metrics[0].trend).toBeNull()
    expect(two.metrics[0].trend).toBe("up")
    expect(two.metrics[0].delta).toBeCloseTo(0.4)
    expect(two.metrics[0].series).toEqual([23, 23.4])
  })

  it("marks simulated data and never gives it a healthy 'ok' tone (demo mode only)", () => {
    const model = toEnvironmentModel(telemetry({ source: "simulated" }), "demo")
    if (model.status !== "ready") throw new Error("expected ready")
    expect(model.provenance).toBe("simulated")
    expect(model.overall?.tone).toBe("sim")
  })

  it("does not show an overall state before the shared engine catches up", () => {
    const model = toEnvironmentModel(telemetry({ envReady: false }))
    if (model.status !== "ready") throw new Error("expected ready")
    expect(model.overall).toBeNull()
  })

  it("never maps critical engine states to a calm tone", () => {
    const critical = toEnvironmentModel(telemetry({ env: { state: "CRITICAL", alerts: [], chamberIndicators: [] } as unknown as MobileTelemetry["env"], source: "simulated" }), "demo")
    if (critical.status !== "ready") throw new Error("expected ready")
    expect(critical.overall?.tone).toBe("crit")
  })
})

describe("device adapter", () => {
  it("maps provenance from the telemetry source", () => {
    expect(toDeviceModel(telemetry({ source: "live" })).provenance).toBe("real")
    expect(toDeviceModel(telemetry({ source: "simulated", connection: { kind: "simulated", label: "Simulación" } }), "demo").provenance).toBe("simulated")
    expect(toDeviceModel(telemetry({ source: "none", connection: { kind: "offline", label: "Sin conexión" } })).provenance).toBe("unavailable")
  })

  it("reports actuator state read-only and unknown when data is not fresh", () => {
    expect(toDeviceModel(telemetry()).actuators.map((a) => a.state)).toEqual(["off", "on"])
    expect(toDeviceModel(telemetry({ dimmed: true })).actuators.map((a) => a.state)).toEqual(["unknown", "unknown"])
    expect(toDeviceModel(telemetry({ fan: null })).actuators[0].state).toBe("unknown")
  })
})

describe("stage plan", () => {
  it("is derived from the species profile, not hardcoded", () => {
    const profile = { stageTargets: { inoculation: {}, colonization: {}, fruiting: {}, harvest: {} } }
    expect(resolveStagePlan(profile, "colonization")).toEqual(["inoculation", "colonization", "fruiting", "harvest"])
  })

  it("falls back to the full cycle when the profile defines fewer than two stages", () => {
    expect(resolveStagePlan({ stageTargets: {} }, "colonization")).toHaveLength(6)
    expect(resolveStagePlan({ stageTargets: { harvest: {} } }, "colonization")).toHaveLength(6)
  })

  it("always keeps the confirmed stage in the plan", () => {
    const profile = { stageTargets: { inoculation: {}, harvest: {} } }
    expect(resolveStagePlan(profile, "colonization")).toEqual(["inoculation", "colonization", "harvest"])
  })

  it("marks done/current/upcoming and only flags a LATER suggested stage as an estimate", () => {
    const plan = ["inoculation", "colonization", "fruiting", "harvest"] as const
    const later = buildStageSteps(plan, "colonization", "fruiting")
    expect(later.steps.map((s) => s.status)).toEqual(["done", "current", "upcoming", "upcoming"])
    expect(later.steps.find((s) => s.estimated)?.id).toBe("fruiting")
    expect(later.possibleChange).toEqual({ label: "Fructificación" })

    const earlier = buildStageSteps(plan, "fruiting", "inoculation")
    expect(earlier.possibleChange).toBeNull()
    expect(earlier.steps.some((s) => s.estimated)).toBe(false)

    const same = buildStageSteps(plan, "colonization", "colonization")
    expect(same.possibleChange).toBeNull()
  })

  it("ignores a suggestion outside the plan", () => {
    const result = buildStageSteps(["inoculation", "colonization"], "inoculation", "harvest")
    expect(result.possibleChange).toBeNull()
  })
})

describe("cultivation adapter", () => {
  const view = (status: GrowView["status"]): GrowView => ({ status, mode: null }) as GrowView

  it("maps loading, no crop and failures to explicit states", () => {
    expect(toCultivationModel(view("loading"))).toEqual({ status: "loading" })
    expect(toCultivationModel(view("unconfigured"))).toEqual({ status: "empty" })
    expect(toCultivationModel(view("no_active_run"))).toEqual({ status: "empty" })
    expect(toCultivationModel(view("network_error"))).toMatchObject({ status: "failed", reason: "network_error" })
    expect(toCultivationModel(view("unauthorized"))).toMatchObject({ status: "failed", reason: "unauthorized" })
    expect(toCultivationModel(view("profile_missing"))).toMatchObject({ status: "failed", reason: "profile_missing" })
  })

  it("builds a simulated crop from the demo composition, labelled as simulated", () => {
    const { snapshot, timeline } = buildDemoGrowComposition({ scenario: "stable", stage: null, now: NOW })
    const model = toCultivationModel({ status: "ready", mode: "simulation", snapshot, timeline, evaluatedAt: NOW.toISOString(), notices: [] })
    if (model.status !== "ready") throw new Error("expected ready")
    expect(model.provenance).toBe("simulated")
    expect(model.day).toBe(11)
    expect(model.stage.label).toBe("Colonización")
    expect(model.stage.position).toBe(2)
    expect(model.stage.total).toBe(6)
    expect(model.sampleProfile).toBe(true)
    // The elapsed-days suggestion (consolidation) is an estimate, never the registered stage.
    expect(model.stage.id).toBe("colonization")
    expect(model.possibleChange).toEqual({ label: "Consolidación" })
    expect(model.log.every((entry) => entry.provenance === "simulated")).toBe(true)
  })

  it("exposes no progress percentage anywhere in the model", () => {
    const { snapshot, timeline } = buildDemoGrowComposition({ scenario: "stable", stage: "fruiting", now: NOW })
    const model = toCultivationModel({ status: "ready", mode: "simulation", snapshot, timeline, evaluatedAt: NOW.toISOString(), notices: [] })
    const serialized = JSON.stringify(model)
    expect(serialized).not.toMatch(/percent|progress|"%"/i)
    expect(serialized).not.toMatch(/\d+\s?%/)
  })

  it("treats a real crop as real unless its readings are simulated", () => {
    const run = createSampleOysterRun()
    const snapshot = {
      run,
      profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
      reading: null,
      state: { confirmedStage: run.confirmedStage, suggestedStage: "colonization", origin: null },
      myko: {},
    } as unknown as Parameters<typeof toCultivationModel>[0] extends infer V ? (V extends { snapshot: infer S } ? S : never) : never
    const model = toCultivationModel({ status: "ready", mode: "real", snapshot, timeline: [], evaluatedAt: NOW.toISOString(), notices: [] })
    if (model.status !== "ready") throw new Error("expected ready")
    expect(model.provenance).toBe("real")
    expect(model.possibleChange).toBeNull()
    expect(model.log).toEqual([])
  })
})

describe("logbook", () => {
  const events: GrowTimelineEvent[] = [
    { id: "a", at: "2026-10-10T10:00:00.000Z", kind: "cultivation_started", origin: "real" },
    { id: "b", at: "2026-10-14T10:00:00.000Z", kind: "metric_dropped", metric: "humidity", origin: "simulated" },
    { id: "c", at: "not-a-date", kind: "signal_lost", origin: "real" },
  ]

  it("sorts newest first, drops invalid dates and keeps provenance", () => {
    const log = toLog(events)
    expect(log.map((e) => e.id)).toEqual(["b", "a"])
    expect(log[0]).toMatchObject({ title: "La humedad bajó", provenance: "simulated" })
    expect(log[1]).toMatchObject({ title: "Comenzó el cultivo", provenance: "real" })
  })

  it("uses neutral copy (no first-person mascot voice)", () => {
    const all: GrowTimelineEvent["kind"][] = ["metric_missing", "signal_lost", "reading_received", "condition_stable"]
    for (const kind of all) {
      const [entry] = toLog([{ id: kind, at: NOW.toISOString(), kind, metric: "humidity", origin: "real" }])
      expect(entry.title).not.toMatch(/\b(dejé|perdí|mi |mis )/i)
    }
  })
})

describe("photos adapter", () => {
  const source = { images: [] as { name: string; url: string; uploadedAt: string }[], loading: false, error: null as string | null }

  it("distinguishes loading, unavailable storage, error and genuinely empty", () => {
    expect(toPhotosModel({ ...source, loading: true })).toEqual({ status: "loading" })
    expect(toPhotosModel({ ...source, error: "Supabase not configured" })).toEqual({ status: "unavailable" })
    expect(toPhotosModel({ ...source, error: "Failed to fetch" })).toEqual({ status: "error" })
    expect(toPhotosModel(source)).toEqual({ status: "empty" })
  })

  it("treats a storage that exists but has no bucket/photos yet as empty, not as an error", () => {
    expect(classifyCaptureError("Bucket not found")).toBe("empty")
    expect(classifyCaptureError("The resource was not found")).toBe("empty")
    expect(toPhotosModel({ ...source, error: "Bucket not found" })).toEqual({ status: "empty" })
    expect(classifyCaptureError("Supabase not configured")).toBe("unavailable")
    expect(classifyCaptureError("network down")).toBe("error")
    expect(classifyCaptureError(null)).toBe("none")
  })

  it("orders photos oldest → newest and drops ones without a valid date", () => {
    const model = toPhotosModel({
      ...source,
      images: [
        { name: "c", url: "https://x/c.jpg", uploadedAt: "2026-10-12T10:00:00.000Z" },
        { name: "a", url: "https://x/a.jpg", uploadedAt: "2026-10-08T10:00:00.000Z" },
        { name: "bad", url: "https://x/bad.jpg", uploadedAt: "nope" },
        { name: "nourl", url: "", uploadedAt: "2026-10-09T10:00:00.000Z" },
      ],
    })
    if (model.status !== "ready") throw new Error("expected ready")
    expect(model.items.map((p) => p.id)).toEqual(["a", "c"])
    expect(model.items.every((p) => p.kind === "capture")).toBe(true)
  })
})

describe("demonstration photos", () => {
  it("are always labelled demo, ordered, and inside the run window", () => {
    const start = new Date(NOW.getTime() - 10 * 86_400_000).toISOString()
    const photos = buildDemoPhotos(start, NOW)
    expect(photos.length).toBeGreaterThanOrEqual(3)
    expect(photos.every((p) => p.kind === "demo")).toBe(true)
    const times = photos.map((p) => new Date(p.capturedAt).getTime())
    expect([...times].sort((a, b) => a - b)).toEqual(times)
    expect(times[0]).toBeGreaterThanOrEqual(new Date(start).getTime())
    expect(times[times.length - 1]).toBeLessThanOrEqual(NOW.getTime())
    expect(photos[0].url.startsWith("data:image/svg+xml")).toBe(true)
  })

  it("produce nothing for an invalid or future run", () => {
    expect(buildDemoPhotos("nope", NOW)).toEqual([])
    expect(buildDemoPhotos(new Date(NOW.getTime() + 1000).toISOString(), NOW)).toEqual([])
  })
})

describe("lab request", () => {
  const parse = (q: string) => parseLabRequest(new URLSearchParams(q))

  it("works with no parameters at all", () => {
    expect(parse("").grow).toEqual({ kind: "unconfigured" })
    expect(labHref("/design-lab/home-v2/cultivo", parse(""))).toBe("/design-lab/home-v2/cultivo")
  })

  it("keeps links clean: demo/scenario/photos params never travel; only a real chamber does", () => {
    expect(labHref("/design-lab/home-v2", parse("mode=simulation&scenario=dry&photos=demo&x=1"))).toBe("/design-lab/home-v2")
    expect(labHref("/design-lab/home-v2/ambiente", parse("chamber=abc-1&x=1"))).toBe("/design-lab/home-v2/ambiente?chamber=abc-1")
  })
})

describe("history feed", () => {
  const activity: ActivityItem[] = [
    { id: "e1", kind: "event", severity: "success", title: "Reconectado", timestamp: 2_000 },
    { id: "a1", kind: "alert", severity: "warning", title: "Humedad baja", detail: "bajo el mínimo", timestamp: null },
    { id: "c1", kind: "change", severity: "critical", title: "Estable → Crítico", timestamp: 5_000 },
  ]

  it("puts active alerts first, then newest first, mapping kinds and tones", () => {
    const feed = toHistoryEntries(activity)
    expect(feed.map((e) => e.id)).toEqual(["a1", "c1", "e1"])
    expect(feed[0]).toMatchObject({ kind: "alert", tone: "warn", at: null })
    expect(feed[1]).toMatchObject({ kind: "event", tone: "crit" })
  })

  it("drops anything derived from simulated telemetry unless the demo mode is on", () => {
    const withSim: ActivityItem[] = [
      ...activity,
      { id: "s1", kind: "alert", severity: "info", title: "Simulación activa", timestamp: null, simulated: true },
      { id: "s2", kind: "change", severity: "warning", title: "Estable → Prealerta", timestamp: 9_000, simulated: true },
    ]
    expect(toHistoryEntries(withSim).map((e) => e.id)).toEqual(["a1", "c1", "e1"])
    const demo = toHistoryEntries(withSim, "demo")
    expect(demo.map((e) => e.id)).toEqual(["a1", "s1", "s2", "c1", "e1"])
    expect(demo.filter((e) => e.simulated).map((e) => e.id)).toEqual(["s1", "s2"])
  })

  it("does not mix crop logbook entries into the environment history", () => {
    expect(toHistoryEntries(activity, "demo").some((e) => (e.kind as string) === "crop")).toBe(false)
  })

  it("maps every severity to a tone", () => {
    expect(["info", "success", "warning", "critical"].map((s) => severityToTone(s as ActivityItem["severity"]))).toEqual(["info", "ok", "warn", "crit"])
  })
})

describe("metric sample times", () => {
  it("keeps one display time per sample for the chart", () => {
    const model = toEnvironmentModel(
      telemetry({
        history: [
          { time: "10:00:01", temperature: 22, humidity: 60 },
          { time: "10:00:04", temperature: 22.5, humidity: 61 },
          { time: "10:00:07", temperature: 23, humidity: 62 },
        ],
      }),
    )
    if (model.status !== "ready") throw new Error("expected ready")
    expect(model.metrics[0].times).toEqual(["10:00:01", "10:00:04", "10:00:07"])
    expect(model.metrics[0].times).toHaveLength(model.metrics[0].series.length)
  })
})

describe("no simulation outside the explicit demo mode", () => {
  const sim = telemetry({ source: "simulated", connection: { kind: "simulated", label: "Simulación" } })

  it("shows the shared hook's silent simulator as 'no device' in normal mode", () => {
    expect(toEnvironmentModel(sim)).toMatchObject({ status: "waiting", reason: "disconnected" })
    const device = toDeviceModel(sim)
    expect(device).toMatchObject({ kind: "offline", label: "Desconectado", provenance: "unavailable", lastSampleAt: null })
    expect(device.actuators.every((a) => a.state === "unknown")).toBe(true)
    expect(resolveTelemetry(sim, "normal")).toBe("UNAVAILABLE")
  })

  it("shows the same telemetry as SIMULATED only while the demo mode is on", () => {
    expect(resolveTelemetry(sim, "demo")).toBe("SIMULATED")
    expect(toEnvironmentModel(sim, "demo")).toMatchObject({ status: "ready", provenance: "simulated" })
    expect(toDeviceModel(sim, "demo")).toMatchObject({ kind: "simulated", provenance: "simulated" })
  })

  it("real device data is REAL in both modes (it is never relabelled)", () => {
    expect(resolveTelemetry(telemetry(), "normal")).toBe("REAL")
    expect(resolveTelemetry(telemetry(), "demo")).toBe("REAL")
    expect(toEnvironmentModel(telemetry(), "normal")).toMatchObject({ status: "ready", provenance: "real" })
  })

  it("flags any SIMULATED source in normal mode as a leak", () => {
    expect(assertNoSimulationOutsideDemo({ mode: "normal", telemetry: "SIMULATED", cultivation: "UNAVAILABLE", photos: "SIMULATED" })).toEqual(["telemetry", "photos"])
    expect(assertNoSimulationOutsideDemo({ mode: "demo", telemetry: "SIMULATED", cultivation: "SIMULATED", photos: "SIMULATED" })).toEqual([])
  })
})

describe("source resolution", () => {
  it("resolves connecting without data to LOADING and no device to UNAVAILABLE", () => {
    expect(resolveTelemetry(telemetry({ hasData: false, source: "none", connection: { kind: "connecting", label: "Conectando" } }), "normal")).toBe("LOADING")
    expect(resolveTelemetry(telemetry({ hasData: false, source: "none", connection: { kind: "offline", label: "Sin conexión" } }), "normal")).toBe("UNAVAILABLE")
  })

  it("resolves cultivation and photos to the five kinds", () => {
    expect(resolveCultivation({ status: "loading" })).toBe("LOADING")
    expect(resolveCultivation({ status: "empty" })).toBe("UNAVAILABLE")
    expect(resolveCultivation({ status: "failed", reason: "network_error", title: "", detail: "" })).toBe("ERROR")
    const { snapshot, timeline } = buildDemoGrowComposition({ scenario: "stable", stage: null, now: NOW })
    const sim = toCultivationModel({ status: "ready", mode: "simulation", snapshot, timeline, evaluatedAt: NOW.toISOString(), notices: [] })
    expect(resolveCultivation(sim)).toBe("SIMULATED")
    expect(resolvePhotos({ status: "loading" })).toBe("LOADING")
    expect(resolvePhotos({ status: "empty" })).toBe("UNAVAILABLE")
    expect(resolvePhotos({ status: "unavailable" })).toBe("UNAVAILABLE")
    expect(resolvePhotos({ status: "error" })).toBe("ERROR")
    expect(resolvePhotos({ status: "ready", items: [{ id: "a", url: "u", capturedAt: NOW.toISOString(), kind: "capture" }] })).toBe("REAL")
    expect(resolvePhotos({ status: "ready", items: [{ id: "d", url: "u", capturedAt: NOW.toISOString(), kind: "demo" }] })).toBe("SIMULATED")
  })
})

describe("demo mode preference", () => {
  it("is OFF for anything missing, malformed or unexpected", () => {
    for (const raw of [null, "", "nope", "[]", "null", '{"enabled":"yes"}', '{"enabled":false}', "123"]) {
      expect(parseDemoState(raw)).toEqual(DEMO_OFF)
    }
  })

  it("round-trips an enabled state and falls back to a valid scenario", () => {
    expect(parseDemoState(serializeDemoState({ enabled: true, scenario: "hot" }))).toEqual({ enabled: true, scenario: "hot" })
    expect(parseDemoState('{"enabled":true,"scenario":"bogus"}')).toEqual({ enabled: true, scenario: "stable" })
    expect(serializeDemoState(DEMO_OFF)).toBe('{"enabled":false}')
  })

  it("only the internal URL switch can turn it on without the user's preference", () => {
    expect(demoFromUrl({ kind: "unconfigured" })).toBeNull()
    expect(demoFromUrl({ kind: "real", chamberId: "abc" })).toBeNull()
    expect(demoFromUrl({ kind: "simulation", scenario: "dry", stage: null, notices: [] })).toEqual({ enabled: true, scenario: "dry" })
  })

  it("serves a simulated grow request ONLY while the demo is on; a URL switch cannot revive it once off", () => {
    const urlSim: GrowRequest = { kind: "simulation", scenario: "dry", stage: null, notices: [] }
    expect(effectiveGrowRequest(DEMO_OFF, urlSim)).toEqual({ kind: "unconfigured" })
    expect(effectiveGrowRequest(DEMO_OFF, { kind: "real", chamberId: "abc" })).toEqual({ kind: "real", chamberId: "abc" })
    expect(effectiveGrowRequest({ enabled: true, scenario: "hot" }, { kind: "unconfigured" })).toMatchObject({ kind: "simulation", scenario: "hot" })
    // demo never mixes with a real chamber selection
    expect(effectiveGrowRequest({ enabled: true, scenario: "stable" }, { kind: "real", chamberId: "abc" }).kind).toBe("simulation")
  })

  it("persists through the store and stays off by default (server snapshot is always off)", () => {
    resetDemoStoreForTests()
    localStorage.removeItem(DEMO_STORAGE_KEY)
    expect(getDemoServerSnapshot()).toEqual(DEMO_OFF)
    expect(getDemoSnapshot()).toEqual(DEMO_OFF)
    let notified = 0
    const stop = subscribeDemo(() => { notified += 1 })
    setDemoState({ enabled: true, scenario: "dry" })
    expect(getDemoSnapshot()).toEqual({ enabled: true, scenario: "dry" })
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBe('{"enabled":true,"scenario":"dry"}')
    setDemoState({ enabled: true, scenario: "dry" }) // same state: no churn
    expect(notified).toBe(1)
    setDemoState(DEMO_OFF)
    expect(getDemoSnapshot()).toEqual(DEMO_OFF)
    expect(notified).toBe(2)
    stop()
    resetDemoStoreForTests()
  })
})
