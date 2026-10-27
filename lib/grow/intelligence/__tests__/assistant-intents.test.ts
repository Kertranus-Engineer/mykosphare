import { describe, expect, it } from "vitest"
import {
  buildAssistantContext, classifyIntent, deriveActivity, interpretEnvironment, respondWithRules,
  type CatalogEntry, type CultivationFacts, type EnvTargets, type ReadingPoint,
} from "../index"

const now = new Date("2026-10-27T15:00:00Z")
const hourOf = (ms: number) => new Date(ms).getUTCHours()
const step = 5 * 60_000
const device = { name: "MYKO-001", enabled: true, lastSeenAt: now.toISOString() }
const TARGETS: EnvTargets = { temperature: { min: 20, max: 24 }, humidity: { min: 60, max: 75 } }
const catalog: CatalogEntry[] = [{ name: "Sample oyster mushroom", scientificName: "Pleurotus ostreatus", validation: "sample", example: { temperature: { min: 20, max: 24 }, humidity: { min: 60, max: 75 } } }]

function history(hours: number, fn: (t: number, i: number) => [number, number]): ReadingPoint[] {
  const out: ReadingPoint[] = []
  const start = now.getTime() - hours * 3_600_000
  for (let t = start, i = 0; t <= now.getTime(); t += step, i++) {
    const [temperature, humidity] = fn(t, i)
    out.push({ observedAt: new Date(t).toISOString(), temperature, humidity })
  }
  return out
}
function ctx(h: ReadingPoint[], over: { targets?: EnvTargets | null; cultivation?: CultivationFacts | null; catalog?: CatalogEntry[] } = {}) {
  const targets = over.targets === undefined ? null : over.targets
  const report = interpretEnvironment({ readings: h.slice(-120).reverse(), device, targets, now })
  const events = deriveActivity(h, targets, now, { gapMs: 15 * 60_000 })
  return buildAssistantContext({ report, history: h, events, now, deviceName: "MYKO-001", hourOf, cultivation: over.cultivation ?? null, catalog: over.catalog ?? catalog })
}
const crop: CultivationFacts = { name: "Mi cultivo", speciesName: "Sample oyster mushroom", scientificName: "Pleurotus ostreatus", stage: "colonization", stageLabel: "Colonización", startedAt: "2026-10-25T10:00:00Z", validation: "sample", rangesSource: "profile", targetsConfirmed: false }

describe("intent matching (Spanish free text)", () => {
  const cases: [string, string][] = [
    ["¿Cómo está mi cultivo?", "status"],
    ["como va todo?", "status"],
    ["¿Qué ocurrió anoche?", "overnight"],
    ["¿Qué pasó durante la noche?", "overnight"],
    ["¿Por qué bajó la humedad?", "why_humidity"],
    ["la humedad bajó mucho, ¿por qué?", "why_humidity"],
    ["¿Por qué subió la temperatura?", "why_temperature"],
    ["¿Qué debería cambiar?", "what_to_check"],
    ["¿Qué puedo mejorar?", "improve"],
    ["¿Cuánto tiempo lleva conectado?", "uptime"],
    ["¿Sigue conectado el dispositivo?", "device_connected"],
    ["¿Qué especie me recomiendas para comenzar?", "species"],
    ["¿Qué necesitas de mí para funcionar mejor?", "needs"],
    ["¿Qué cambió desde ayer?", "since_yesterday"],
    ["Quiero cultivar hongos ostra", "start_crop"],
    ["hola", "greeting"],
    ["cuéntame un chiste", "unknown"],
    ["", "unknown"],
  ]
  it.each(cases)("%s → %s", (text, intent) => expect(classifyIntent(text)).toBe(intent))
})

describe("rule-based answers from real data", () => {
  const base = history(24, (t) => [new Date(t).getUTCHours() >= 22 || new Date(t).getUTCHours() < 7 ? 21 : 23, t > now.getTime() - 2 * 3_600_000 ? 55 : 70])

  it("answers what happened last night with measured numbers and no alerts", () => {
    const a = respondWithRules("¿Qué ocurrió anoche?", ctx(base))
    expect(a.source).toBe("rules")
    expect(a.text).toMatch(/Anoche|Esta noche/)
    expect(a.text).toContain("mediciones")
  })

  it("explains a humidity drop as an observation and admits the cause is unknown", () => {
    const a = respondWithRules("¿Por qué bajó la humedad?", ctx(base))
    expect(a.text).toContain("70 %")
    expect(a.text).toContain("55 %")
    expect(a.text).toContain("no puedo saber la causa")
  })

  it("reports continuous connection time and recent cuts", () => {
    const cut = base.filter(r => { const t = Date.parse(r.observedAt); return t < now.getTime() - 3 * 3_600_000 || t > now.getTime() - 2 * 3_600_000 })
    const a = respondWithRules("¿Cuánto tiempo lleva conectado?", ctx(cut))
    expect(a.text).toMatch(/Lleva 1 h 5[0-9] min/)
    expect(a.text).toContain("1 corte")
  })

  it("recommends only profiles that exist, labels them as example, and compares with the real temperature", () => {
    const hot = history(2, () => [26, 65])
    const a = respondWithRules("¿Qué especie me recomiendas para comenzar?", ctx(hot))
    expect(a.text).toContain("Sample oyster mushroom")
    expect(a.text).toContain("de ejemplo y no está validado")
    expect(a.text).toContain("26,0 °C")
    expect(a.text).toContain("enfriar o ventilar")
    expect(a.action?.href).toBe("/home/cultivo")
    expect(respondWithRules("¿Qué especie me recomiendas?", ctx(hot, { catalog: [] })).text).toContain("no puedo recomendarte una con respaldo")
  })

  it("lists what it needs and never invents sensors", () => {
    const a = respondWithRules("¿Qué necesitas de mí para funcionar mejor?", ctx(history(2, () => [22, 65])))
    expect(a.text).toContain("Registrar qué vas a cultivar")
    const sensors = ctx(history(2, () => [22, 65])).capabilities
    expect(sensors).toEqual({ sensors: ["temperature", "humidity"], actuators: false })
  })

  it("asks to confirm ranges and flags unvalidated profiles when a crop exists", () => {
    const c = ctx(history(30, () => [22, 68]), { targets: TARGETS, cultivation: crop })
    expect(c.missing).toEqual(expect.arrayContaining(["targets_unconfirmed", "profile_not_validated", "no_actuators", "sensors_limited"]))
    expect(c.missing).not.toContain("no_cultivation")
    expect(respondWithRules("¿Qué puedo mejorar?", c).text).toContain("Confirmar los rangos")
    expect(respondWithRules("¿Cómo está mi cultivo?", c).text).toContain("colonización")
  })

  it("owner-defined confirmed ranges stop asking for confirmation", () => {
    const c = ctx(history(30, () => [22, 68]), { targets: TARGETS, cultivation: { ...crop, rangesSource: "owner", targetsConfirmed: true } })
    expect(c.missing).not.toContain("targets_unconfirmed")
    expect(c.missing).not.toContain("profile_not_validated")
  })

  it("never claims physical actions and says it cannot control anything", () => {
    for (const q of ["¿Qué debería cambiar?", "¿Qué puedo mejorar?", "¿Qué necesitas de mí?", "¿Cómo está mi cultivo?"]) {
      expect(respondWithRules(q, ctx(base, { targets: TARGETS })).text).not.toMatch(/\b(encendí|apagué|activé|ajusté|subí|bajé la)\b/i)
    }
  })

  it("marks free text it cannot place as not understood so a configured model can take over", () => {
    const a = respondWithRules("explícame la teoría de la relatividad", ctx(base))
    expect(a.understood).toBe(false)
    expect(a.questionId).toBe("unknown")
  })
})
