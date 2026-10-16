import { afterEach, describe, expect, it, vi } from "vitest"

import { GROW_DEMO_SCENARIOS, type GrowDemoScenario } from "@/lib/grow/demo/simulation-demo"
import { DEMO_CROP_DAY, DEMO_PHOTO_DAYS } from "../data/demo/crop"
import { getDemoClock, resetDemoClockForTests, subscribeDemoClock } from "../data/demo/clock"
import { existsSync, statSync } from "node:fs"
import path from "node:path"

import { demoHeroUrl, demoPhotoThumbUrl, demoPhotoUrl } from "../data/demo/assets"
import { colonizationCover, oysterFrameSvg } from "../data/demo/frames"
import { buildDemoWorld, type DemoWorld } from "../data/demo/world"

/** A fixed afternoon in local time so the example crop's "today" has room for its scheduled events. */
const NOW = new Date(2026, 9, 15, 15, 20, 0).getTime()
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

function ready(world: DemoWorld) {
  if (world.environment.status !== "ready") throw new Error("expected a ready environment")
  return world.environment
}
const metric = (world: DemoWorld, id: "temperature" | "humidity") => ready(world).metrics.find((m) => m.id === id)!

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  resetDemoClockForTests()
})

describe("demo engine: the example crop", () => {
  const world = buildDemoWorld("stable", NOW)

  it("is Pleurotus ostreatus (hongo ostra), active, day 11, colonization, and simulated", () => {
    expect(world.cultivation).toMatchObject({
      status: "ready",
      provenance: "simulated",
      name: "Hongo ostra",
      scientificName: "Pleurotus ostreatus",
      day: DEMO_CROP_DAY,
      stage: { id: "colonization", label: "Colonización" },
    })
    expect(world.cultivation.sampleProfile).toBe(true)
  })

  it("marks earlier stages done, colonization current and later ones upcoming, with no percentages", () => {
    const status = Object.fromEntries(world.cultivation.steps.map((s) => [s.id, s.status]))
    expect(status).toMatchObject({ inoculation: "done", colonization: "current", consolidation: "upcoming", primordia: "upcoming" })
    expect(JSON.stringify(world.cultivation)).not.toMatch(/%|percent|progress/i)
    // The elapsed-time estimate is only an estimate and never replaces the confirmed stage.
    expect(world.cultivation.stage.id).toBe("colonization")
  })

  it("has six distinct pictures, one per documented day, oldest first, never in the future, all labelled demo", () => {
    expect(world.photos.map((p) => p.day)).toEqual([...DEMO_PHOTO_DAYS])
    expect(world.photos.every((p) => p.kind === "demo")).toBe(true)
    expect(new Set(world.photos.map((p) => p.url)).size).toBe(world.photos.length)
    expect(world.photos.every((p) => p.url.startsWith("/demo/oyster/"))).toBe(true)
    const times = world.photos.map((p) => new Date(p.capturedAt).getTime())
    expect([...times].sort((a, b) => a - b)).toEqual(times)
    expect(Math.max(...times)).toBeLessThanOrEqual(NOW)
  })

  it("tells one story: every picture has its logbook entry, on the same day, and every entry is dated inside the crop", () => {
    const log = world.cultivation.log
    for (const photo of world.photos) {
      const entry = log.find((e) => e.photoId === photo.id)
      expect(entry, `log entry for ${photo.id}`).toBeDefined()
      expect(entry!.at).toBe(photo.capturedAt)
      expect(entry!.day).toBe(photo.day)
    }
    const start = new Date(world.cultivation.startedAt).getTime()
    for (const entry of log) {
      const at = new Date(entry.at).getTime()
      expect(at).toBeGreaterThanOrEqual(start)
      expect(at).toBeLessThanOrEqual(NOW)
      expect(entry.provenance).toBe("simulated")
      expect(entry.day).toBeGreaterThanOrEqual(1)
      expect(entry.day).toBeLessThanOrEqual(DEMO_CROP_DAY)
      // The stated day must be the calendar day the entry happened on.
      const dayStart = (ms: number) => new Date(new Date(ms).setHours(0, 0, 0, 0)).getTime()
      expect(entry.day).toBe(DEMO_CROP_DAY - Math.round((dayStart(NOW) - dayStart(at)) / DAY))
    }
  })

  it("confirms colonization before any observation that mentions it and never claims a later stage", () => {
    const log = world.cultivation.log
    const confirmed = log.find((e) => e.kind === "stage")!
    expect(confirmed.title).toContain("Colonización")
    expect(log.filter((e) => e.kind === "stage")).toHaveLength(1)
    expect(log.some((e) => /primordio|fructif|cosecha/i.test(`${e.title} ${e.detail ?? ""}`))).toBe(false)
  })

  it("never shows fruiting bodies: the example crop is still colonizing", () => {
    expect(world.photos.every((p) => (p.caption ?? "").length > 0)).toBe(true)
    expect(world.photos.some((p) => /hongo|seta|cuerpo fructífero/i.test(p.caption ?? ""))).toBe(false)
  })
})

describe("demo engine: determinism and smoothness", () => {
  it("is a pure function of (scenario, minute): no clock reads, no randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => { throw new Error("Math.random used") })
    const now = vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("Date.now used") })
    for (const scenario of GROW_DEMO_SCENARIOS) {
      expect(buildDemoWorld(scenario, NOW)).toEqual(buildDemoWorld(scenario, NOW))
    }
    expect(random).not.toHaveBeenCalled()
    expect(now).not.toHaveBeenCalled()
  })

  it("treats any instant inside the same minute as the same world", () => {
    expect(buildDemoWorld("dry", NOW + 41_000)).toEqual(buildDemoWorld("dry", NOW))
  })

  it("evolves smoothly: one minute later no reading jumps", () => {
    for (const scenario of GROW_DEMO_SCENARIOS) {
      for (let k = 0; k < 120; k++) {
        const a = buildDemoWorld(scenario, NOW + k * MINUTE)
        const b = buildDemoWorld(scenario, NOW + (k + 1) * MINUTE)
        if (a.environment.status !== "ready" || b.environment.status !== "ready") continue
        for (const m of a.environment.metrics) {
          const next = b.environment.metrics.find((x) => x.id === m.id)!
          if (m.value === null || next.value === null) continue
          expect(Math.abs(next.value - m.value), `${scenario} ${m.id} @${k}`).toBeLessThanOrEqual(m.id === "temperature" ? 0.4 : 1.6)
        }
      }
    }
  })

  it("keeps small variations small: a stable crop stays inside the example range all day", () => {
    for (let k = 0; k < 24 * 4; k++) {
      const world = buildDemoWorld("stable", NOW + k * 15 * MINUTE)
      for (const m of ready(world).metrics) {
        expect(m.value).not.toBeNull()
        expect(m.condition?.label).toBe("Nominal")
      }
      expect(world.history.filter((e) => e.at === null)).toHaveLength(0)
    }
  })

  it("every scenario yields finite, aligned series and no NaN anywhere", () => {
    for (const scenario of GROW_DEMO_SCENARIOS) {
      for (const offset of [0, 37, 95, 600]) {
        const world = buildDemoWorld(scenario, NOW + offset * MINUTE)
        expect(JSON.stringify(world)).not.toMatch(/NaN|undefined/)
        if (world.environment.status !== "ready") continue
        for (const m of world.environment.metrics) {
          expect(m.series.length).toBeLessThanOrEqual(36)
          expect(m.times).toHaveLength(m.series.length)
          expect(m.series.every(Number.isFinite)).toBe(true)
        }
      }
    }
  })
})

describe("demo engine: scenarios change everything together", () => {
  const activeAlerts = (world: DemoWorld) => world.history.filter((e) => e.at === null)

  it("stable: calm, never the healthy-real tone, no alerts, actuators idle", () => {
    const world = buildDemoWorld("stable", NOW)
    const env = ready(world)
    expect(env.provenance).toBe("simulated")
    expect(env.overall).toMatchObject({ level: "stable", tone: "sim", label: "Estable" })
    expect(activeAlerts(world)).toHaveLength(0)
    expect(world.device.actuators.map((a) => a.state)).toEqual(["off", "off"])
    expect(world.insight).toMatchObject({ status: "demo", headline: "Colonización avanzando con normalidad" })
  })

  it("dry: humidity leaves the range, one warning alert, humidifier on, the story names the drop", () => {
    const world = buildDemoWorld("dry", NOW)
    expect(metric(world, "humidity").value!).toBeLessThan(60)
    expect(metric(world, "humidity").condition).toMatchObject({ label: "Baja", tone: "warn" })
    expect(metric(world, "temperature").condition?.label).toBe("Nominal")
    expect(ready(world).overall).toMatchObject({ level: "prealert", label: "Prealerta" })
    expect(activeAlerts(world).map((a) => [a.title, a.tone])).toEqual([["Humedad baja", "warn"]])
    expect(world.device.actuators.find((a) => a.id === "humidifier")?.state).toBe("on")
    expect(world.cultivation.log.some((e) => e.title === "Humedad baja" && e.kind === "environment")).toBe(true)
    expect(world.insight.headline).toMatch(/humedad/i)
  })

  it("humid: the fan runs; cold has no heater to claim; hot runs the fan", () => {
    expect(buildDemoWorld("humid", NOW).device.actuators.find((a) => a.id === "fan")?.state).toBe("on")
    const cold = buildDemoWorld("cold", NOW)
    expect(metric(cold, "temperature").condition?.label).toBe("Baja")
    expect(cold.device.actuators.map((a) => a.state)).toEqual(["off", "off"])
    expect(buildDemoWorld("hot", NOW).device.actuators.find((a) => a.id === "fan")?.state).toBe("on")
  })

  it("critical: alert level, critical alerts first in the feed, critical events in the logbook", () => {
    const world = buildDemoWorld("critical", NOW)
    expect(ready(world).overall).toMatchObject({ level: "alert", tone: "crit" })
    expect(activeAlerts(world).some((a) => a.tone === "crit")).toBe(true)
    expect(world.history[0].at).toBeNull()
    expect(world.cultivation.log.some((e) => e.tone === "crit")).toBe(true)
    expect(world.insight.tone).toBe("crit")
  })

  it("partial: humidity is missing (null, never zero) and says so", () => {
    const world = buildDemoWorld("partial", NOW)
    expect(metric(world, "humidity").value).toBeNull()
    expect(metric(world, "humidity").series.length).toBeLessThan(metric(world, "temperature").series.length)
    expect(activeAlerts(world).some((a) => a.title === "Sin lectura de humedad")).toBe(true)
  })

  it("stale: values are kept but dimmed, no current state, actuators unknown, an event marks the last reading", () => {
    const world = buildDemoWorld("stale", NOW)
    const env = ready(world)
    expect(env.dimmed).toBe(true)
    expect(env.overall).toMatchObject({ level: "nodata", label: "Datos atrasados" })
    expect(env.metrics.every((m) => m.condition === null)).toBe(true)
    expect(world.device).toMatchObject({ kind: "stale", tone: "warn" })
    expect(world.device.actuators.every((a) => a.state === "unknown")).toBe(true)
    expect(world.cultivation.log.some((e) => e.title === "Última lectura recibida")).toBe(true)
    expect(NOW - new Date(world.device.lastSampleAt!).getTime()).toBeGreaterThanOrEqual(5 * MINUTE)
  })

  it("offline: connection lost, last sample long ago, the loss is logged after the last reading", () => {
    const world = buildDemoWorld("offline", NOW)
    expect(ready(world).dimmed).toBe(true)
    expect(world.device).toMatchObject({ kind: "offline", label: "Sin conexión", tone: "crit" })
    const lost = world.cultivation.log.find((e) => e.title === "Se perdió la señal del dispositivo")!
    expect(new Date(lost.at).getTime()).toBeGreaterThan(new Date(world.device.lastSampleAt!).getTime())
    expect(NOW - new Date(world.device.lastSampleAt!).getTime()).toBeGreaterThanOrEqual(30 * MINUTE)
  })

  it("no-data: nothing is invented, only the disconnected state", () => {
    const world = buildDemoWorld("no-data", NOW)
    expect(world.environment).toMatchObject({ status: "waiting", reason: "disconnected" })
    expect(world.device).toMatchObject({ provenance: "unavailable", lastSampleAt: null })
    expect(world.device.actuators.every((a) => a.state === "unknown")).toBe(true)
    // The crop itself (photos, logbook) still exists: only the sensors are missing.
    expect(world.photos).toHaveLength(6)
  })

  it("everything the demo produces is marked simulated, and the example insight is labelled", () => {
    for (const scenario of GROW_DEMO_SCENARIOS as readonly GrowDemoScenario[]) {
      const world = buildDemoWorld(scenario, NOW)
      expect(world.history.every((e) => e.simulated)).toBe(true)
      expect(world.cultivation.provenance).toBe("simulated")
      expect(world.insight.status).toBe("demo")
      if (world.environment.status === "ready") expect(world.environment.provenance).toBe("simulated")
    }
  })

  it("restarts its story every two hours, so any scenario can be inspected at any time", () => {
    const a = buildDemoWorld("dry", NOW)
    const b = buildDemoWorld("dry", NOW + 90 * MINUTE)
    expect(metric(a, "humidity").value!).toBeLessThan(60)
    expect(metric(b, "humidity").value!).toBeLessThan(60)
  })
})

describe("demo engine: pictures", () => {
  it("the same inoculation points grow from day to day (cover only increases)", () => {
    const covers = DEMO_PHOTO_DAYS.map(colonizationCover)
    expect(covers).toEqual([...covers].sort((x, y) => x - y))
    expect(covers[0]).toBe(0)
    expect(covers[covers.length - 1]).toBeGreaterThan(0.85)
    expect(covers[covers.length - 1]).toBeLessThan(1)
  })

  it("the generator draws a different scene each day, with a tighter crop for the hero", () => {
    const scenes = DEMO_PHOTO_DAYS.map((day) => oysterFrameSvg(day))
    expect(new Set(scenes).size).toBe(scenes.length)
    expect(oysterFrameSvg(5, true)).toContain('viewBox="80 200 640 800"')
    expect(oysterFrameSvg(5)).toContain('viewBox="0 0 800 1000"')
  })

  it("ships every picture as a small static file (no SVG built on the phone)", () => {
    const publicFile = (url: string) => path.join(process.cwd(), "public", url)
    for (const day of DEMO_PHOTO_DAYS) {
      for (const url of [demoPhotoUrl(day), demoPhotoThumbUrl(day)]) {
        expect(existsSync(publicFile(url)), url).toBe(true)
        expect(statSync(publicFile(url)).size, url).toBeLessThan(60 * 1024)
      }
    }
    expect(existsSync(publicFile(demoHeroUrl(DEMO_CROP_DAY)!))).toBe(true)
    expect(demoHeroUrl(5)).toBeUndefined()
  })

  it("points the model at those files; only the newest picture has a hero crop", () => {
    const world = buildDemoWorld("stable", NOW)
    expect(world.photos.map((p) => p.url)).toEqual(DEMO_PHOTO_DAYS.map(demoPhotoUrl))
    expect(world.photos.map((p) => p.thumbUrl)).toEqual(DEMO_PHOTO_DAYS.map(demoPhotoThumbUrl))
    expect(world.photos.filter((p) => p.heroUrl).map((p) => p.day)).toEqual([DEMO_CROP_DAY])
  })
})

describe("demo clock", () => {
  it("is null on the server and before anyone subscribes, so nothing time-dependent renders early", () => {
    expect(getDemoClock()).toBeNull()
  })

  it("ticks once per minute only while subscribed and pauses while the page is hidden", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 15, 12, 0, 20))
    const spy = vi.fn()
    const stop = subscribeDemoClock(spy)
    const first = getDemoClock()
    expect(first).toBe(new Date(2026, 9, 15, 12, 0, 0).getTime())

    vi.advanceTimersByTime(60_000)
    expect(getDemoClock()).toBe(new Date(2026, 9, 15, 12, 1, 0).getTime())
    const calls = spy.mock.calls.length

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" })
    document.dispatchEvent(new Event("visibilitychange"))
    vi.advanceTimersByTime(10 * 60_000)
    expect(spy.mock.calls.length).toBe(calls) // no work in the background

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" })
    document.dispatchEvent(new Event("visibilitychange"))
    expect(getDemoClock()).toBe(new Date(2026, 9, 15, 12, 11, 0).getTime())

    stop()
    expect(vi.getTimerCount()).toBe(0) // nobody listening → no timer at all
  })
})
