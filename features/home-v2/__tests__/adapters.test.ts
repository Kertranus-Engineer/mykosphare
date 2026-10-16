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
  toCropHistory,
  toHistoryEntries,
  toLog,
  toPhotosModel,
} from "../data/adapters"
import {
  DEMO_OFF,
  DEMO_STORAGE_KEY,
  defaultDemoState,
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

  it("gives each engine state a status level and never a calm one when data is not fresh", () => {
    const level = (state: string, extra: Partial<MobileTelemetry> = {}) => {
      const model = toEnvironmentModel(telemetry({ env: { state, alerts: [], chamberIndicators: [] } as unknown as MobileTelemetry["env"], ...extra }))
      if (model.status !== "ready") throw new Error("expected ready")
      return model.overall?.level
    }
    expect(level("STABLE")).toBe("stable")
    expect(level("OPTIMIZING")).toBe("optimizing")
    expect(level("PRE_WARNING")).toBe("prealert")
    expect(level("CRITICAL")).toBe("alert")
    expect(level("STABLE", { dimmed: true })).toBe("nodata")
  })

  it("does not show an overall state before the shared engine catches up", () => {
    const model = toEnvironmentModel(telemetry({ envReady: false }))
    if (model.status !== "ready") throw new Error("expected ready")
    expect(model.overall).toBeNull()
  })

  it("never maps critical engine states to a calm tone", () => {
    const critical = toEnvironmentModel(telemetry({ env: { state: "CRITICAL", alerts: [], chamberIndicators: [] } as unknown as MobileTelemetry["env"] }))
    if (critical.status !== "ready") throw new Error("expected ready")
    expect(critical.overall?.tone).toBe("crit")
  })
})

describe("device adapter", () => {
  it("maps provenance from the telemetry source", () => {
    expect(toDeviceModel(telemetry({ source: "live" })).provenance).toBe("real")
    expect(toDeviceModel(telemetry({ source: "simulated", connection: { kind: "simulated", label: "Simulación" } })).provenance).toBe("unavailable")
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

describe("lab request", () => {
  const parse = (q: string) => parseLabRequest(new URLSearchParams(q))

  it("works with no parameters at all", () => {
    expect(parse("").grow).toEqual({ kind: "unconfigured" })
    expect(labHref("/home/cultivo", parse(""))).toBe("/home/cultivo")
  })

  it("keeps links clean: demo/scenario/photos params never travel; only a real chamber does", () => {
    expect(labHref("/home", parse("mode=simulation&scenario=dry&photos=demo&x=1"))).toBe("/home")
    expect(labHref("/home/ambiente", parse("chamber=abc-1&x=1"))).toBe("/home/ambiente?chamber=abc-1")
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

  it("drops anything derived from simulated telemetry (the demo uses its own engine)", () => {
    const withSim: ActivityItem[] = [
      ...activity,
      { id: "s1", kind: "alert", severity: "info", title: "Simulación activa", timestamp: null, simulated: true },
      { id: "s2", kind: "change", severity: "warning", title: "Estable → Prealerta", timestamp: 9_000, simulated: true },
    ]
    expect(toHistoryEntries(withSim).map((e) => e.id)).toEqual(["a1", "c1", "e1"])
    expect(toHistoryEntries(withSim).every((e) => !e.simulated)).toBe(true)
  })

  it("gives every entry an icon category", () => {
    expect(toHistoryEntries(activity).map((e) => e.category)).toEqual(["alert", "session", "session"])
  })

  it("maps the crop record to timeline entries (milestones, stages and captures are crop; environment is not)", () => {
    const entries = toCropHistory([
      { id: "1", at: "2026-10-01T10:00:00.000Z", kind: "milestone", title: "Comenzó", tone: "ok", provenance: "real" },
      { id: "2", at: "2026-10-02T10:00:00.000Z", kind: "environment", title: "Humedad bajó", tone: "watch", provenance: "real", day: 2 },
    ])
    expect(entries.map((e) => [e.kind, e.category, e.simulated, e.day])).toEqual([
      ["crop", "milestone", false, undefined],
      ["event", "environment", false, 2],
    ])
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

describe("no simulation outside the demonstration mode", () => {
  const sim = telemetry({ source: "simulated", connection: { kind: "simulated", label: "Simulación" } })

  it("shows the shared hook's silent simulator as 'no device', always", () => {
    expect(toEnvironmentModel(sim)).toMatchObject({ status: "waiting", reason: "disconnected" })
    const device = toDeviceModel(sim)
    expect(device).toMatchObject({ kind: "offline", label: "Desconectado", provenance: "unavailable", lastSampleAt: null })
    expect(device.actuators.every((a) => a.state === "unknown")).toBe(true)
    expect(resolveTelemetry(sim)).toBe("UNAVAILABLE")
  })

  it("real device data is REAL and keeps its provenance", () => {
    expect(resolveTelemetry(telemetry())).toBe("REAL")
    expect(toEnvironmentModel(telemetry())).toMatchObject({ status: "ready", provenance: "real", window: "session" })
  })

  it("flags any SIMULATED source in normal mode as a leak", () => {
    expect(assertNoSimulationOutsideDemo({ mode: "normal", telemetry: "SIMULATED", cultivation: "UNAVAILABLE", photos: "SIMULATED" })).toEqual(["telemetry", "photos"])
    expect(assertNoSimulationOutsideDemo({ mode: "demo", telemetry: "SIMULATED", cultivation: "SIMULATED", photos: "SIMULATED" })).toEqual([])
  })
})

describe("source resolution", () => {
  it("resolves connecting without data to LOADING and no device to UNAVAILABLE", () => {
    expect(resolveTelemetry(telemetry({ hasData: false, source: "none", connection: { kind: "connecting", label: "Conectando" } }))).toBe("LOADING")
    expect(resolveTelemetry(telemetry({ hasData: false, source: "none", connection: { kind: "offline", label: "Sin conexión" } }))).toBe("UNAVAILABLE")
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
  it("starts ON for a visitor with no saved choice while the development default is on", () => {
    expect(defaultDemoState(true)).toEqual({ enabled: true, scenario: "stable" })
    for (const raw of [null, "", "nope", "[]", "null", '{"enabled":"yes"}', "123"]) {
      expect(parseDemoState(raw, true)).toEqual({ enabled: true, scenario: "stable" })
    }
  })

  it("can be switched off before launch (default off) and then starts OFF", () => {
    expect(defaultDemoState(false)).toEqual(DEMO_OFF)
    for (const raw of [null, "", "nope", "[]", '{"enabled":"yes"}']) {
      expect(parseDemoState(raw, false)).toEqual(DEMO_OFF)
    }
  })

  it("a saved choice always wins over the default, in both directions", () => {
    expect(parseDemoState('{"enabled":false}', true)).toEqual(DEMO_OFF)
    expect(parseDemoState('{"enabled":true,"scenario":"dry"}', false)).toEqual({ enabled: true, scenario: "dry" })
  })

  it("round-trips an enabled state and falls back to a valid scenario", () => {
    expect(parseDemoState(serializeDemoState({ enabled: true, scenario: "hot" }), false)).toEqual({ enabled: true, scenario: "hot" })
    expect(parseDemoState('{"enabled":true,"scenario":"bogus"}', false)).toEqual({ enabled: true, scenario: "stable" })
    expect(serializeDemoState(DEMO_OFF)).toBe('{"enabled":false}')
  })

  it("the internal URL switch turns it on (testing only)", () => {
    expect(demoFromUrl({ kind: "unconfigured" })).toBeNull()
    expect(demoFromUrl({ kind: "real", chamberId: "abc" })).toBeNull()
    expect(demoFromUrl({ kind: "simulation", scenario: "dry", stage: null, notices: [] })).toEqual({ enabled: true, scenario: "dry" })
  })

  it("never asks the grow store for simulation: the demo crop comes from the demo engine, and a real chamber is never mixed in", () => {
    const urlSim: GrowRequest = { kind: "simulation", scenario: "dry", stage: null, notices: [] }
    expect(effectiveGrowRequest(DEMO_OFF, urlSim)).toEqual({ kind: "unconfigured" })
    expect(effectiveGrowRequest(DEMO_OFF, { kind: "real", chamberId: "abc" })).toEqual({ kind: "real", chamberId: "abc" })
    expect(effectiveGrowRequest({ enabled: true, scenario: "hot" }, urlSim)).toEqual({ kind: "unconfigured" })
    expect(effectiveGrowRequest({ enabled: true, scenario: "stable" }, { kind: "real", chamberId: "abc" })).toEqual({ kind: "unconfigured" })
  })

  it("persists the user's choice through the store; the server snapshot is the default", () => {
    resetDemoStoreForTests()
    localStorage.removeItem(DEMO_STORAGE_KEY)
    expect(getDemoServerSnapshot()).toBe(defaultDemoState())
    expect(getDemoSnapshot()).toEqual(defaultDemoState())
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
