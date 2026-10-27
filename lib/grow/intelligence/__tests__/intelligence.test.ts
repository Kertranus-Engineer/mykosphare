import { describe, expect, it } from "vitest"
import {
  ACTUATION_ENABLED, AUTONOMY_MODES, QUESTIONS, answerWithRules, buildAssistantContext, canExecutePhysicalAction,
  decideActuator, deriveActivity, interpretEnvironment, rulesProvider, validateActuatorPolicy,
  type ActuatorSafetyPolicy, type EnvTargets, type ReadingPoint,
} from "../index"

const STEP = 30_000
const T0 = Date.parse("2026-10-27T12:00:00Z")
const TARGETS: EnvTargets = {
  temperature: { min: 20, max: 24, criticalMin: 16, criticalMax: 28 },
  humidity: { min: 60, max: 75, criticalMin: 45, criticalMax: 90 },
  label: "Perfil de ejemplo", validation: "sample",
}
/** Newest first, like the API. */
function readings(values: [number | null, number | null][], endAt = T0 + values.length * STEP, step = STEP): ReadingPoint[] {
  return values.map(([temperature, humidity], i) => ({ observedAt: new Date(endAt - (values.length - 1 - i) * step).toISOString(), temperature, humidity })).reverse()
}
const device = { name: "MYKO-001", enabled: true, lastSeenAt: null as string | null }
const run = (rs: ReadingPoint[], over: Partial<Parameters<typeof interpretEnvironment>[0]> = {}) =>
  interpretEnvironment({ readings: rs, device, targets: TARGETS, now: new Date(T0 + 20 * STEP), ...over })
const flat = (n: number, t: number, h: number): [number, number][] => Array.from({ length: n }, () => [t, h])

describe("MYKO Intelligence — interpretation", () => {
  it("reports a stable environment when both metrics stay inside the range", () => {
    const report = run(readings(flat(20, 22, 68), T0 + 19 * STEP))
    expect(report.summary.headline).toBe("Todo está estable.")
    expect(report.summary.tone).toBe("ok")
    expect(report.findings.map(f => f.kind)).toEqual(["in_range"])
    expect(report.recommendations).toEqual([])
    expect(report.source).toBe("rules")
  })

  it("asks for configuration instead of judging when no stage/targets exist, and never invents a stage", () => {
    const report = run(readings(flat(20, 22, 68), T0 + 19 * STEP), { targets: null })
    expect(report.summary.headline).toBe("Tu cámara está conectada y midiendo.")
    expect(report.findings.some(f => f.kind === "needs_configuration")).toBe(true)
    expect(report.findings.some(f => f.kind === "in_range")).toBe(false)
    expect(report.primaryAction).toMatchObject({ kind: "configure_cultivation", href: "/home/cultivo", label: "Empezar con MYKO" })
    expect(report.current).toMatchObject({ temperature: 22, humidity: 68 })
  })

  it("flags low humidity only after persistence, and the recommendation names its cause", () => {
    const spike = readings([...flat(17, 22, 68), [22, 50], [22, 68], [22, 68]], T0 + 19 * STEP)
    expect(run(spike).findings.map(f => f.kind)).toEqual(["in_range"]) // one bad sample is not an alert
    const sustained = readings([...flat(14, 22, 68), ...flat(6, 22, 55)], T0 + 19 * STEP)
    const report = run(sustained)
    const finding = report.findings.find(f => f.kind === "humidity_low")
    expect(finding).toMatchObject({ severity: "attention", value: 55, metric: "humidity" })
    expect(report.summary.headline).toBe("La humedad está por debajo del rango configurado.")
    const rec = report.recommendations.find(r => r.findingKind === "humidity_low")
    expect(rec?.cause).toMatchObject({ metric: "humidity", value: 55 })
    expect(rec?.cause.target).toEqual(TARGETS.humidity)
    expect(rec?.body).toContain("55 %")
    expect(rec?.proposal).toMatchObject({ intent: "raise_humidity", available: false })
    expect(rec?.requiresHuman).toBe(true)
  })

  it("keeps the same finding id while the condition persists (no repeated alerts)", () => {
    const a = run(readings([...flat(14, 22, 68), ...flat(6, 22, 55)], T0 + 19 * STEP))
    const b = run(readings([...flat(14, 22, 68), ...flat(8, 22, 54)], T0 + 21 * STEP), { now: new Date(T0 + 22 * STEP) })
    const idA = a.findings.find(f => f.kind === "humidity_low")?.id
    expect(idA).toBeDefined()
    expect(b.findings.find(f => f.kind === "humidity_low")?.id).toBe(idA)
  })

  it("applies hysteresis: hovering just above the limit does not clear an alert, a real recovery does", () => {
    const hovering = readings([...flat(10, 22, 68), ...flat(6, 22, 55), ...flat(4, 22, 60.8)], T0 + 19 * STEP)
    expect(run(hovering).findings.some(f => f.kind === "humidity_low")).toBe(true) // 60.8 < 60 + 2 margin
    const recovered = readings([...flat(10, 22, 68), ...flat(6, 22, 55), ...flat(4, 22, 63)], T0 + 19 * STEP)
    expect(run(recovered).findings.some(f => f.kind === "humidity_low")).toBe(false)
  })

  it("marks critical when the critical limit is crossed", () => {
    const report = run(readings([...flat(12, 22, 68), ...flat(8, 29, 68)], T0 + 19 * STEP))
    expect(report.findings.find(f => f.kind === "temperature_high")?.severity).toBe("critical")
    expect(report.summary.tone).toBe("critical")
  })

  it("reports both metrics out of range in one calm sentence", () => {
    const report = run(readings([...flat(10, 22, 68), ...flat(10, 26, 50)], T0 + 19 * STEP))
    expect(report.summary.headline).toBe("La temperatura y la humedad están fuera del rango configurado.")
  })

  it("detects a rapid change without declaring an out-of-range condition", () => {
    const rs = readings([...flat(10, 22, 70), ...Array.from({ length: 10 }, (_, i): [number, number] => [22, 70 - (i + 1) * 2])], T0 + 19 * STEP)
    const report = run(rs, { targets: { ...TARGETS, humidity: { min: 40, max: 80 } } })
    expect(report.findings.some(f => f.kind === "rapid_change" && f.metric === "humidity")).toBe(true)
    expect(report.summary.headline).toBe("Hubo un cambio rápido en el ambiente.")
  })

  it("treats old readings as stale or offline and does not evaluate ranges on them", () => {
    const rs = readings(flat(20, 22, 50), T0 + 19 * STEP)
    const stale = run(rs, { now: new Date(T0 + 19 * STEP + 3 * 60_000) })
    expect(stale.connection).toBe("stale")
    expect(stale.findings.map(f => f.kind)).toEqual(["reading_stale"])
    const offline = run(rs, { now: new Date(T0 + 19 * STEP + 10 * 60_000) })
    expect(offline.connection).toBe("offline")
    expect(offline.summary.headline).toBe("MYKO-001 dejó de enviar mediciones.")
    expect(offline.primaryAction?.kind).toBe("check_device")
    expect(offline.findings.some(f => f.kind === "humidity_low")).toBe(false)
  })

  it("never fabricates data when there are no readings", () => {
    const report = run([], { now: new Date(T0) })
    expect(report.current).toBeNull()
    expect(report.summary.headline).toBe("Esperando la primera medición.")
  })

  it("rejects physically impossible values and reports the sensor instead of judging them", () => {
    const rs = readings([...flat(19, 22, 68), [22, 140]], T0 + 19 * STEP)
    const report = run(rs)
    expect(report.findings.some(f => f.kind === "sensor_invalid" && f.metric === "humidity")).toBe(true)
    expect(report.current?.humidity).toBeNull()
    expect(report.summary.headline).toBe("Una medición no es válida.")
    expect(report.findings.some(f => f.kind === "humidity_high")).toBe(false)
  })

  it("flags an implausible jump between consecutive samples as invalid", () => {
    const rs = readings([...flat(19, 22, 68), [60, 68]], T0 + 19 * STEP)
    expect(run(rs).findings.some(f => f.kind === "sensor_invalid" && f.metric === "temperature")).toBe(true)
  })

  it("says it lacks data when too few samples exist", () => {
    const report = run(readings(flat(2, 22, 68), T0 + STEP), { now: new Date(T0 + 2 * STEP) })
    expect(report.summary.headline).toBe("Aún no tengo suficientes mediciones.")
  })

  it("treats a disabled device as offline", () => {
    const report = run(readings(flat(20, 22, 68), T0 + 19 * STEP), { device: { ...device, enabled: false } })
    expect(report.summary.headline).toBe("MYKO-001 está deshabilitado.")
  })
})

describe("MYKO Intelligence — activity", () => {
  it("derives episodes and lost-signal periods from stored readings", () => {
    const step = 5 * 60_000
    const rs = readings([...flat(6, 22, 68), ...flat(5, 22, 52), ...flat(4, 22, 68)], T0 + 14 * step, step)
    const events = deriveActivity(rs, TARGETS, new Date(T0 + 14 * step + step), { config: undefined })
    const humidity = events.find(e => e.kind === "out_of_range")
    expect(humidity?.title).toBe("La humedad baja")
    expect(humidity?.endedAt).not.toBeNull()
    const gapped = [...readings(flat(5, 22, 68), T0 + 4 * STEP), ...readings(flat(5, 22, 68), T0 + 40 * 60_000)]
    expect(deriveActivity(gapped, TARGETS, new Date(T0 + 41 * 60_000)).some(e => e.kind === "signal_lost" && e.endedAt)).toBe(true)
  })

  it("reports an ongoing lost signal", () => {
    const events = deriveActivity(readings(flat(10, 22, 68), T0 + 9 * STEP), TARGETS, new Date(T0 + 9 * STEP + 20 * 60_000))
    expect(events[0]).toMatchObject({ kind: "signal_lost", endedAt: null })
  })
})

describe("MYKO Assistant — rules provider", () => {
  const now = new Date("2026-10-27T15:00:00Z")
  const hourOf = (ms: number) => new Date(ms).getUTCHours()
  const step = 5 * 60_000
  const history: ReadingPoint[] = []
  for (let t = now.getTime() - 24 * 3_600_000; t <= now.getTime(); t += step) {
    const hour = new Date(t).getUTCHours()
    const drop = t > now.getTime() - 2 * 3_600_000
    history.push({ observedAt: new Date(t).toISOString(), temperature: hour >= 22 || hour < 7 ? 21 : 23, humidity: drop ? 55 : 70 })
  }
  const report = interpretEnvironment({ readings: history.slice(-120).reverse(), device, targets: TARGETS, now })
  const ctx = buildAssistantContext({ report, history, events: deriveActivity(history, TARGETS, now, { gapMs: 15 * 60_000 }), now, deviceName: "MYKO-001", hourOf })

  it("builds an allow-listed context without ids or secrets", () => {
    const json = JSON.stringify(ctx)
    expect(json).not.toMatch(/uuid|key|hash|password|owner/i)
    expect(ctx.autonomyMode).toBe("monitor")
  })

  it("answers every supported question from data, labelled as rules", () => {
    for (const q of QUESTIONS) {
      const answer = rulesProvider.answer(q.id, ctx)
      expect(answer).toMatchObject({ questionId: q.id, source: "rules" })
      expect((answer as { text: string }).text.length).toBeGreaterThan(10)
    }
  })

  it("explains a humidity drop with measured values and admits it cannot know the cause", () => {
    const answer = answerWithRules("why_humidity", ctx)
    expect(answer.text).toContain("70 %")
    expect(answer.text).toContain("55 %")
    expect(answer.text).toContain("no puedo saber la causa")
  })

  it("summarises the night and the change since yesterday from stored data", () => {
    expect(answerWithRules("overnight", ctx).text).toMatch(/mediciones/)
    expect(answerWithRules("since_yesterday", ctx).text).toContain("→")
  })

  it("does not pretend to know anything without history", () => {
    const empty = buildAssistantContext({ report: interpretEnvironment({ readings: [], device, targets: null, now }), history: [], events: [], now, hourOf })
    expect(answerWithRules("overnight", empty).text).toContain("No tengo suficientes")
    expect(answerWithRules("since_yesterday", empty).text).toContain("Todavía no tengo")
  })
})

describe("Autonomy model — safety", () => {
  it("keeps physical actuation disabled and only monitoring available", () => {
    expect(ACTUATION_ENABLED).toBe(false)
    expect(AUTONOMY_MODES.monitor.available).toBe(true)
    expect(AUTONOMY_MODES.assisted.available).toBe(false)
    expect(AUTONOMY_MODES.automatic.available).toBe(false)
    for (const mode of ["monitor", "assisted", "automatic"] as const) expect(canExecutePhysicalAction(mode)).toBe(false)
  })

  const humidifier: ActuatorSafetyPolicy = {
    actuator: "humidifier", direction: "raise", metric: "humidity", band: { min: 60, max: 75 }, hysteresis: 5,
    maxContinuousOnMs: 10 * 60_000, minOffMs: 60_000, manualOverrideMaxMs: 30 * 60_000,
    maxSensorAgeMs: 30_000, ackTimeoutMs: 5_000, bootValidReadings: 2,
    onSensorInvalid: "off", onCommunicationLoss: "continue_locally", onReboot: "off_until_valid_reading", recordEveryActuation: true,
  }
  const base = { state: "off" as const, inStateMs: 120_000, manualOverride: null, manualOverrideAgeMs: 0 }

  it("validates policies", () => {
    expect(validateActuatorPolicy(humidifier)).toEqual([])
    expect(validateActuatorPolicy({ ...humidifier, band: { min: 80, max: 60 } })).not.toEqual([])
    expect(validateActuatorPolicy({ ...humidifier, hysteresis: 50 })).not.toEqual([])
  })

  it("reference controller: hysteresis, minimum off time, maximum on time and safe state", () => {
    expect(decideActuator(humidifier, { ...base, value: 55 })).toMatchObject({ command: "on" })
    expect(decideActuator(humidifier, { ...base, value: 55, inStateMs: 10_000 })).toMatchObject({ command: "hold", reason: "min_off_time" })
    expect(decideActuator(humidifier, { ...base, state: "on", value: 62, inStateMs: 60_000 })).toMatchObject({ command: "hold" }) // inside hysteresis
    expect(decideActuator(humidifier, { ...base, state: "on", value: 66, inStateMs: 60_000 })).toMatchObject({ command: "off" })
    expect(decideActuator(humidifier, { ...base, state: "on", value: 50, inStateMs: 11 * 60_000 })).toMatchObject({ command: "off", reason: "max_on_time" })
    expect(decideActuator(humidifier, { ...base, state: "on", value: null, inStateMs: 1_000 })).toMatchObject({ command: "off", reason: "sensor_invalid_safe_state" })
    expect(decideActuator(humidifier, { ...base, value: 72 })).toMatchObject({ command: "hold" })
  })

  it("manual override works but expires, and never defeats the maximum on time", () => {
    expect(decideActuator(humidifier, { ...base, value: 80, manualOverride: "on", manualOverrideAgeMs: 60_000 })).toMatchObject({ command: "on", reason: "manual_override" })
    expect(decideActuator(humidifier, { ...base, state: "on", value: 80, manualOverride: "on", manualOverrideAgeMs: 60_000, inStateMs: 11 * 60_000 })).toMatchObject({ command: "off", reason: "max_on_time" })
    expect(decideActuator(humidifier, { ...base, value: 72, manualOverride: "on", manualOverrideAgeMs: 31 * 60_000 })).toMatchObject({ command: "hold" })
  })
})
