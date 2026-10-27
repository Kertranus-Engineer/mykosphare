import { describe, expect, it } from "vitest"
import {
  ACTUATION_ENABLED, ACTUATOR_READINESS, DECISIONS, buildAssistantContext, classifyIntent, interpretEnvironment, respondWithRules,
  type EnvTargets, type ReadingPoint,
} from "../index"

const now = new Date("2026-10-27T15:00:00Z")
const targets: EnvTargets = { temperature: { min: 20, max: 24 }, humidity: { min: 60, max: 75 } }
const readings = (h: (i: number) => number): ReadingPoint[] =>
  Array.from({ length: 30 }, (_, i) => ({ observedAt: new Date(now.getTime() - i * 30_000).toISOString(), temperature: 22, humidity: h(i) }))
const report = (rs: ReadingPoint[]) => interpretEnvironment({ readings: rs, device: { name: "MYKO-001", enabled: true, lastSeenAt: now.toISOString() }, targets, now })

describe("who decides: automatic, suggestion or needs confirmation", () => {
  it("never produces an automatic decision today", () => {
    const rs = report(readings(() => 50)).recommendations
    expect(rs.length).toBeGreaterThan(0)
    expect(rs.every(r => r.decision.class !== "automatic")).toBe(true)
  })

  it("marks anything that would act on a device as needing confirmation, and says why it is not available", () => {
    const rec = report(readings(() => 50)).recommendations.find(r => r.findingKind === "humidity_low")
    expect(rec?.proposal?.available).toBe(false)
    expect(rec?.decision).toEqual(DECISIONS.needs_confirmation)
    expect(rec?.decision.reason).toContain("hoy no hay actuadores")
  })

  it("marks things a person can check or do as suggestions", () => {
    const stale = report(readings(() => 65).map(r => ({ ...r, observedAt: new Date(Date.parse(r.observedAt) - 3 * 60_000).toISOString() })))
    const rec = stale.recommendations.find(r => r.findingKind === "reading_stale")
    expect(rec?.decision).toEqual(DECISIONS.suggestion)
    expect(rec?.requiresHuman).toBe(true)
  })
})

describe("trend questions", () => {
  const rising: ReadingPoint[] = Array.from({ length: 24 }, (_, i) => ({ observedAt: new Date(now.getTime() - (23 - i) * 5 * 60_000).toISOString(), temperature: 22 + i * 0.1, humidity: 65 }))
  const ctx = () => buildAssistantContext({ report: report(rising.slice().reverse()), history: rising, events: [], now, deviceName: "MYKO-001" })
  it.each(["¿Está subiendo la temperatura?", "¿Cuál es la tendencia?", "¿Se mantiene estable la humedad?"])("%s → trend", (q) => expect(classifyIntent(q)).toBe("trend"))
  it("answers with the measured rate and says what is stable", () => {
    const text = respondWithRules("¿Está subiendo la temperatura?", ctx()).text
    expect(text).toMatch(/sube unos \d,\d °C por hora/)
    expect(text).toContain("La humedad se mantiene estable")
  })
})

describe("readiness gates before any actuator", () => {
  it("is a complete, ordered checklist with nothing marked as done", () => {
    expect(ACTUATION_ENABLED).toBe(false)
    expect(ACTUATOR_READINESS.length).toBeGreaterThanOrEqual(12)
    expect(new Set(ACTUATOR_READINESS.map(g => g.id)).size).toBe(ACTUATOR_READINESS.length)
    expect(ACTUATOR_READINESS.every(g => g.status === "pending" && g.test.length > 20 && g.pass.length > 20)).toBe(true)
  })
  it("covers electrical protection, fail-safe behaviour and a dummy-load trial, with the heater last", () => {
    const ids = ACTUATOR_READINESS.map(g => g.id)
    for (const id of ["separate_power", "protection_sizing", "rcd_earth", "failsafe_default", "watchdog", "max_on_time", "sensor_failure", "hardware_ack", "offline_run", "physical_cutoff", "dummy_load_trial"]) expect(ids).toContain(id)
    expect(ids.at(-1)).toBe("heater_last")
    expect(ids.indexOf("dummy_load_trial")).toBeLessThan(ids.indexOf("heater_last"))
  })
})
