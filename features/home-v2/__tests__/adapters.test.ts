import { describe, expect, it } from "vitest"

import type { ActivityItem } from "@/features/mobile/use-mobile-activity"
import type { MobileTelemetry } from "@/features/mobile/use-mobile-telemetry"
import type { GrowView } from "@/features/grow/data/grow-view"
import { buildDemoGrowComposition } from "@/lib/grow/demo/simulation-demo"
import { createSampleOysterRun, SAMPLE_PLEUROTUS_OSTREATUS_PROFILE } from "@/lib/grow"
import type { GrowTimelineEvent } from "@/lib/grow/timeline"
import {
  buildStageSteps,
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
import { activeScenario, labHref, parseLabRequest, scenarioRequest, withDemoPhotos } from "../data/lab-request"

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
  it("never invents values: no data → waiting, offline explains why", () => {
    expect(toEnvironmentModel(telemetry({ hasData: false, source: "none", connection: { kind: "connecting", label: "Conectando" } }))).toMatchObject({
      status: "waiting",
      title: "Esperando lecturas",
    })
    expect(toEnvironmentModel(telemetry({ hasData: false, source: "none", connection: { kind: "offline", label: "Sin conexión" } }))).toMatchObject({
      status: "waiting",
      title: "Sin lecturas",
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

  it("marks simulated data and never gives it a healthy 'ok' tone", () => {
    const model = toEnvironmentModel(telemetry({ source: "simulated" }))
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
    const critical = toEnvironmentModel(telemetry({ env: { state: "CRITICAL", alerts: [], chamberIndicators: [] } as unknown as MobileTelemetry["env"], source: "simulated" }))
    if (critical.status !== "ready") throw new Error("expected ready")
    expect(critical.overall?.tone).toBe("crit")
  })
})

describe("device adapter", () => {
  it("maps provenance from the telemetry source", () => {
    expect(toDeviceModel(telemetry({ source: "live" })).provenance).toBe("real")
    expect(toDeviceModel(telemetry({ source: "simulated", connection: { kind: "simulated", label: "Simulación" } })).provenance).toBe("simulated")
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
  const source = { images: [] as { name: string; url: string; uploadedAt: string }[], loading: false, error: null as string | null, unavailable: false }

  it("distinguishes loading, unavailable storage, error and empty", () => {
    expect(toPhotosModel({ ...source, loading: true })).toEqual({ status: "loading" })
    expect(toPhotosModel({ ...source, unavailable: true })).toEqual({ status: "unavailable" })
    expect(toPhotosModel({ ...source, error: "No se pudieron cargar las capturas." })).toEqual({ status: "error" })
    expect(toPhotosModel(source)).toEqual({ status: "empty" })
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

  it("defaults to no crop; simulation and demo photos are explicit opt-ins", () => {
    expect(parse("").grow).toEqual({ kind: "unconfigured" })
    expect(parse("photos=demo").demoPhotos).toBe(false)
    expect(parse("mode=simulation&photos=demo").demoPhotos).toBe(true)
    expect(parse("mode=simulation").demoPhotos).toBe(false)
  })

  it("keeps the view across tabs and drops unknown params", () => {
    expect(labHref("/design-lab/home-v2/cultivo", parse("mode=simulation&scenario=dry&photos=demo&x=1"))).toBe(
      "/design-lab/home-v2/cultivo?mode=simulation&scenario=dry&photos=demo",
    )
    expect(labHref("/design-lab/home-v2", parse(""))).toBe("/design-lab/home-v2")
  })

  it("scenario chips switch data without ever enabling real writes", () => {
    const current = parse("mode=simulation&scenario=stable&photos=demo")
    expect(activeScenario(current)).toBe("stable")
    expect(scenarioRequest("none", current)).toEqual({ grow: { kind: "unconfigured" }, demoPhotos: false })
    expect(scenarioRequest("hot", current).grow).toMatchObject({ kind: "simulation", scenario: "hot" })
    expect(withDemoPhotos(parse(""), true).demoPhotos).toBe(false)
  })
})

describe("history feed", () => {
  const activity: ActivityItem[] = [
    { id: "e1", kind: "event", severity: "success", title: "Reconectado", timestamp: 2_000 },
    { id: "a1", kind: "alert", severity: "warning", title: "Humedad baja", detail: "bajo el mínimo", timestamp: null },
    { id: "c1", kind: "change", severity: "critical", title: "Estable → Crítico", timestamp: 5_000 },
  ]

  it("puts active alerts first, then newest first, mapping kinds and tones", () => {
    const feed = toHistoryEntries(activity, { status: "empty" })
    expect(feed.map((e) => e.id)).toEqual(["a1", "c1", "e1"])
    expect(feed[0]).toMatchObject({ kind: "alert", tone: "warn", at: null })
    expect(feed[1]).toMatchObject({ kind: "event", tone: "crit" })
  })

  it("merges the crop logbook only when a crop exists, keeping simulated provenance", () => {
    const { snapshot, timeline } = buildDemoGrowComposition({ scenario: "stable", stage: null, now: NOW })
    const cultivation = toCultivationModel({ status: "ready", mode: "simulation", snapshot, timeline, evaluatedAt: NOW.toISOString(), notices: [] })
    const withCrop = toHistoryEntries(activity, cultivation)
    const crop = withCrop.filter((e) => e.kind === "crop")
    expect(crop.length).toBeGreaterThan(0)
    expect(crop.every((e) => e.simulated && e.at !== null)).toBe(true)
    expect(toHistoryEntries(activity, { status: "loading" }).some((e) => e.kind === "crop")).toBe(false)
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
