import { describe, expect, it } from "vitest"
import { buildAssistantContext, classifyIntent, interpretEnvironment, respondWithRules, type ReadingPoint } from "../../intelligence"
import { controlContext, describeControl } from "../status"
import type { DesiredConfig, HomeControl, ReportedState } from "../types"

const NOW = Date.parse("2026-10-28T15:00:00Z")
const iso = (ms: number) => new Date(ms).toISOString()
const desired = (over: Partial<DesiredConfig> = {}): DesiredConfig => ({
  version: 3, mode: "simulation", targets: { temperature: { min: 22, max: 24 }, humidity: { min: 75, max: 85 } },
  capabilities: { fan_intake: false, fan_exhaust: false, humidifier: false, light: false, heater: false }, note: null, createdAt: iso(NOW - 600_000), ...over,
})
const reported = (over: Partial<ReportedState> = {}): ReportedState => ({
  receivedVersion: 3, appliedVersion: 3, mode: "simulation", controllerState: "idle", simulated: true, sensorOk: true, lastError: null, firmware: "cloud-v1+ctl0-sim", reportedAt: iso(NOW - 20_000), ...over,
})
const control = (d: DesiredConfig | null, r: ReportedState | null, events: HomeControl["events"] = []): HomeControl => ({ desired: d, reported: r, events })

describe("control status: 'Aplicado' only when the device says so", () => {
  it("no configuration", () => expect(describeControl(control(null, null), NOW).phase).toBe("none"))

  it("saved but never reported is only 'Guardada'", () => {
    const s = describeControl(control(desired(), null), NOW)
    expect(s.phase).toBe("unreachable")
    expect(s.label).toContain("Guardada")
    expect(s.label).not.toContain("Aplicado")
  })

  it("a fresh report that has not got the version yet is 'waiting'", () => {
    const s = describeControl(control(desired(), reported({ receivedVersion: 2, appliedVersion: 2 })), NOW)
    expect(s).toMatchObject({ phase: "waiting", tone: "info" })
    expect(s.label).toContain("Esperando que MYKO-001 la reciba")
  })

  it("received but not applied", () => {
    expect(describeControl(control(desired(), reported({ receivedVersion: 3, appliedVersion: 2 })), NOW).phase).toBe("received")
  })

  it("rejected with the reason in plain words", () => {
    const s = describeControl(control(desired({ version: 4 }), reported({ receivedVersion: 4, appliedVersion: 3, lastError: "humidity_out_of_envelope" })), NOW)
    expect(s.phase).toBe("rejected")
    expect(s.label).toContain("la humedad sale de los límites seguros")
    expect(s.controller).toContain("última configuración válida")
  })

  it("applied only with the applied version, and says it is a simulation", () => {
    const s = describeControl(control(desired(), reported({ controllerState: "holding" })), NOW)
    expect(s).toMatchObject({ phase: "applied", tone: "ok", label: "Aplicado por MYKO-001 (v3)." })
    expect(s.controller).toContain("No se activa ninguna salida eléctrica")
  })

  it("an old report is never shown as current", () => {
    const s = describeControl(control(desired(), reported({ reportedAt: iso(NOW - 10 * 60_000) })), NOW)
    expect(s.label).toContain("sin comunicación reciente")
    expect(s.tone).toBe("warn")
  })

  it("a sensor failure puts the controller in the safe wording", () => {
    expect(describeControl(control(desired(), reported({ sensorOk: false, controllerState: "safe" })), NOW).controller).toContain("Modo seguro")
  })
})

const readings = (humidity: (i: number) => number): ReadingPoint[] =>
  Array.from({ length: 80 }, (_, i) => ({ observedAt: iso(NOW - i * 5 * 60_000), temperature: 23, humidity: humidity(i) }))

function assistant(c: HomeControl | null, humidity: (i: number) => number = () => 80) {
  const history = readings(humidity)
  const report = interpretEnvironment({ readings: history.slice(0, 40), device: { name: "MYKO-001", enabled: true, lastSeenAt: iso(NOW) }, targets: null, now: NOW })
  return buildAssistantContext({ report, history, events: [], now: NOW, deviceName: "MYKO-001", control: controlContext(c, NOW) })
}

describe("assistant answers about the control loop", () => {
  it.each([
    ["¿Qué condiciones estamos intentando mantener?", "targets_now"],
    ["¿Qué hizo el ventilador?", "actuator_log"],
    ["¿Está funcionando automáticamente?", "automatic_status"],
    ["Prueba una humedad entre 75 y 85 %", "set_targets"],
    ["¿Qué cambiarías?", "improve"],
    ["¿Por qué aumentó la humedad?", "why_humidity"],
  ])("%s → %s", (q, intent) => expect(classifyIntent(q)).toBe(intent))

  it("states the current target and who confirmed it", () => {
    const text = respondWithRules("¿Qué condiciones estamos intentando mantener?", assistant(control(desired(), reported()))).text
    expect(text).toContain("temperatura 22–24 °C y humedad 75–85 %")
    expect(text).toContain("versión 3")
    expect(text).toContain("Aplicado por MYKO-001")
  })

  it("says there is no target when none exists", () => {
    expect(respondWithRules("¿Qué condiciones estamos intentando mantener?", assistant(control(null, null))).text).toContain("Todavía no hay un objetivo")
  })

  it("only reports simulated actuations and never claims a real one", () => {
    const events = [{ at: iso(NOW - 120_000), kind: "actuation" as const, simulated: true, version: 3, detail: { actuator: "humidifier", command: "on", reason: "below_band", value: 71.2 } }]
    const text = respondWithRules("¿Qué hizo el ventilador?", assistant(control(desired(), reported(), events))).text
    expect(text).toContain("SIMULADAS")
    expect(text).toContain("encendería")
    expect(text).toContain("ninguna salida eléctrica se activó")
    expect(text).not.toMatch(/\b(encendió|apagó|activó)\b/)
    expect(respondWithRules("¿Qué hizo el ventilador?", assistant(control(desired(), reported()))).text).toContain("No hay actuaciones registradas")
  })

  it("is honest that automatic mode does not exist", () => {
    const text = respondWithRules("¿Está funcionando automáticamente?", assistant(control(desired(), reported()))).text
    expect(text.startsWith("No:")).toBe(true)
    expect(text).toContain("prueba (simulación)")
  })

  it("turns a request into a proposal with the exact values and assumptions, saving nothing", () => {
    const answer = respondWithRules("Quiero una temperatura de 23 °C y humedad entre 75 y 85 %", assistant(control(null, null)))
    expect(answer.proposal).toMatchObject({ mode: "simulation", targets: { temperature: { min: 22, max: 24 }, humidity: { min: 75, max: 85 } } })
    expect(answer.text).toContain("PRUEBA (simulación)")
    expect(answer.text).toContain("Interpreté 23 °C como 22–24 °C")
    expect(answer.text).toContain("Se guarda solo si lo confirmas")
  })

  it("explains an unsafe request instead of proposing it", () => {
    const answer = respondWithRules("quiero humedad entre 10 y 50", assistant(null))
    expect(answer.proposal).toBeUndefined()
    expect(answer.text).toContain("límites seguros")
  })

  it("explains a rise as an observation with no invented cause", () => {
    const answer = respondWithRules("¿Por qué aumentó la humedad?", assistant(null, i => (i < 6 ? 85 : 65)))
    expect(answer.text).toContain("subió")
    expect(answer.text).toContain("no puedo saber la causa")
  })
})
