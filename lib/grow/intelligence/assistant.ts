import { describeTargets, interpretTargetRequest, type TargetProposal } from "../control/request"
import { agoText, durationText, num, rangeText, withUnit } from "./copy.es"
import { DEFAULT_INTELLIGENCE_CONFIG } from "./config"
import { classifyIntent, type Intent } from "./intent"
import { normalizeSeries, validValue, type Sample } from "./series"
import { analyzeTelemetry, type TelemetryInsights } from "./telemetry"
import type {
  ActivityEvent, CatalogEntry, ControlContext, CultivationFacts, EnvTargets, IntelligenceReport, MetricId, MissingInfo, ReadingPoint, Summary,
} from "./types"

/**
 * MYKO ASSISTANT — provider-agnostic context and a deterministic answerer.
 *
 * `buildAssistantContext` projects real, already-computed facts into a small allow-listed structure (no ids, keys,
 * owner data or hardware identifiers). Any provider can consume it; `respondWithRules` answers from the same data and
 * says so. Nothing here calls a model, and nothing claims a physical action happened.
 */
export interface Stats { min: number; max: number; avg: number; count: number }
export interface AssistantContext {
  schemaVersion: 2
  generatedAt: string
  device: { name: string | null; connection: IntelligenceReport["connection"]; lastReadingAt: string | null }
  current: IntelligenceReport["current"]
  targets: EnvTargets | null
  cultivation: CultivationFacts | null
  catalog: CatalogEntry[]
  autonomyMode: "monitor"
  /** What the hardware can and cannot do today. */
  capabilities: { sensors: MetricId[]; actuators: false }
  summary: Summary
  findings: { kind: string; severity: string; metric?: MetricId; since?: string }[]
  recommendations: { title: string; body: string }[]
  events: ActivityEvent[]
  window24h: { samples: number; temperature: Stats | null; humidity: Stats | null }
  /** Numbers and sentences derived from the measurements alone (trend, stability, coverage, day vs night). */
  telemetry: TelemetryInsights
  uptime: { streakStartedAt: string | null; streakMs: number; gaps: number; firstSampleAt: string | null }
  sinceYesterday: { then: { temperature: number | null; humidity: number | null } | null; now: { temperature: number | null; humidity: number | null } | null }
  overnight: { from: string; to: string; ongoing: boolean; samples: number; temperature: Stats | null; humidity: Stats | null; events: ActivityEvent[] } | null
  drop: { metric: MetricId; from: number; to: number; fromAt: string; toAt: string } | null
  /** Largest recent rise of a metric versus its 6 h low (observation, never a cause). */
  rise: { metric: MetricId; from: number; to: number; fromAt: string; toAt: string } | null
  /** Desired vs reported control state, from real device reports. null when the account has no device control data. */
  control: ControlContext | null
  missing: MissingInfo[]
}

/** The six chips of V1 stay valid ids; the assistant now understands free text too. */
export type QuestionId = "status" | "why_humidity" | "overnight" | "what_to_check" | "device_connected" | "since_yesterday"
export const QUESTIONS: { id: QuestionId; label: string }[] = [
  { id: "status", label: "¿Cómo está mi cámara?" },
  { id: "what_to_check", label: "¿Qué debería revisar?" },
  { id: "overnight", label: "¿Qué ocurrió anoche?" },
  { id: "why_humidity", label: "¿Por qué bajó la humedad?" },
  { id: "device_connected", label: "¿Sigue conectado?" },
  { id: "since_yesterday", label: "¿Qué cambió desde ayer?" },
]
export const SUGGESTIONS: { id: Intent; label: string }[] = [
  { id: "status", label: "¿Cómo está mi cámara?" },
  { id: "improve", label: "¿Qué puedo mejorar?" },
  { id: "overnight", label: "¿Qué ocurrió anoche?" },
  { id: "needs", label: "¿Qué necesitas de mí?" },
]

export interface AssistantAnswer {
  questionId: Intent
  /** Always disclosed: where the words came from. */
  source: "rules" | "model"
  text: string
  evidence: string[]
  /** Optional single next step shown as a button. */
  action?: { label: string; href: string }
  /** The rules did not understand the text; a configured model may take over. */
  understood: boolean
  /** A change of targets the person asked for. It is only a PROPOSAL: nothing is saved until they confirm the exact values. */
  proposal?: TargetProposal
}

export interface AssistantProvider {
  id: string
  answer(question: Intent, context: AssistantContext, text?: string): Promise<AssistantAnswer> | AssistantAnswer
}

const HOUR = 3_600_000
const GAP_MS = 15 * 60_000

function stats(samples: readonly Sample[], metric: MetricId): Stats | null {
  const values = samples.map(s => validValue(s, metric)).filter((v): v is number => v !== null)
  if (!values.length) return null
  return { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, b) => a + b, 0) / values.length, count: values.length }
}
const avgIn = (samples: readonly Sample[], metric: MetricId, from: number, to: number) =>
  stats(samples.filter(s => s.t >= from && s.t <= to), metric)?.avg ?? null

export interface BuildContextInput {
  report: IntelligenceReport
  /** Up to 24 h of real readings (5-minute averages are fine). */
  history: readonly ReadingPoint[]
  events: readonly ActivityEvent[]
  now: string | number | Date
  deviceName?: string | null
  cultivation?: CultivationFacts | null
  catalog?: readonly CatalogEntry[]
  control?: ControlContext | null
  /** Hour of day (0–23) in the person's local time. Injectable for tests. */
  hourOf?: (ms: number) => number
}

export function buildAssistantContext(input: BuildContextInput): AssistantContext {
  const now = new Date(input.now).getTime()
  const samples = normalizeSeries(input.history, DEFAULT_INTELLIGENCE_CONFIG)
  const hourOf = input.hourOf ?? ((ms: number) => new Date(ms).getHours())
  const last24 = samples.filter(s => now - s.t <= 24 * HOUR)
  const latest = samples[samples.length - 1]

  const inNight = (ms: number) => { const h = hourOf(ms); return h >= 22 || h < 7 }
  const nightSamples = last24.filter(s => inNight(s.t))
  const overnight = nightSamples.length >= 3
    ? {
        from: nightSamples[0]?.iso ?? "", to: nightSamples[nightSamples.length - 1]?.iso ?? "", ongoing: inNight(now), samples: nightSamples.length,
        temperature: stats(nightSamples, "temperature"), humidity: stats(nightSamples, "humidity"),
        events: input.events.filter(e => inNight(Date.parse(e.startedAt)) && now - Date.parse(e.startedAt) <= 24 * HOUR),
      }
    : null

  // Largest recent fall of either metric versus the 6 h peak (observation, never a cause).
  let drop: AssistantContext["drop"] = null
  let rise: AssistantContext["rise"] = null
  if (latest) {
    for (const metric of ["humidity", "temperature"] as const) {
      const current = validValue(latest, metric)
      const recent = samples.filter(s => now - s.t <= 6 * HOUR && s.t < latest.t && validValue(s, metric) !== null)
      const extreme = (better: (a: number, b: number) => boolean) => recent.reduce<Sample | null>((best, s) => (best === null || better(validValue(s, metric) as number, validValue(best, metric) as number) ? s : best), null)
      const peak = extreme((a, b) => a > b)
      const valley = extreme((a, b) => a < b)
      const threshold = metric === "humidity" ? 5 : 2
      if (current !== null && peak) {
        const from = validValue(peak, metric) as number
        if (from - current >= threshold && (!drop || metric === "humidity")) drop = { metric, from, to: current, fromAt: peak.iso, toAt: latest.iso }
      }
      if (current !== null && valley) {
        const from = validValue(valley, metric) as number
        if (current - from >= threshold && (!rise || metric === "humidity")) rise = { metric, from, to: current, fromAt: valley.iso, toAt: latest.iso }
      }
    }
  }

  // Continuous connection: walk back from the latest sample until a silence longer than the gap threshold.
  let streakIdx = last24.length - 1
  for (let i = last24.length - 1; i > 0; i--) {
    if ((last24[i]?.t ?? 0) - (last24[i - 1]?.t ?? 0) > GAP_MS) break
    streakIdx = i - 1
  }
  const streakBegin = latest ? last24[streakIdx] : undefined
  const uptime = {
    streakStartedAt: streakBegin?.iso ?? null,
    streakMs: latest && streakBegin ? (input.report.connection === "live" ? now : latest.t) - streakBegin.t : 0,
    gaps: last24.slice(1).filter((s, i) => s.t - (last24[i]?.t ?? s.t) > GAP_MS).length,
    firstSampleAt: last24[0]?.iso ?? null,
  }

  const cultivation = input.cultivation ?? null
  const missing: MissingInfo[] = []
  if (!cultivation) missing.push("no_cultivation")
  else {
    if (!cultivation.targetsConfirmed) missing.push("targets_unconfirmed")
    if (cultivation.validation !== "validated" && cultivation.rangesSource !== "owner") missing.push("profile_not_validated")
  }
  missing.push("no_actuators", "sensors_limited")
  if (last24.length < 36) missing.push("short_history")

  return {
    schemaVersion: 2,
    generatedAt: new Date(now).toISOString(),
    device: { name: input.deviceName ?? null, connection: input.report.connection, lastReadingAt: latest?.iso ?? null },
    current: input.report.current,
    targets: input.report.targets,
    cultivation,
    catalog: [...(input.catalog ?? [])],
    autonomyMode: "monitor",
    capabilities: { sensors: ["temperature", "humidity"], actuators: false },
    summary: input.report.summary,
    findings: input.report.findings.map(f => ({ kind: f.kind, severity: f.severity, metric: f.metric, since: f.since })),
    recommendations: input.report.recommendations.map(r => ({ title: r.title, body: r.body })),
    events: [...input.events],
    window24h: { samples: last24.length, temperature: stats(last24, "temperature"), humidity: stats(last24, "humidity") },
    telemetry: analyzeTelemetry(input.history, now, { hourOf }),
    uptime,
    sinceYesterday: {
      then: samples.some(s => now - s.t >= 22 * HOUR && now - s.t <= 26 * HOUR)
        ? { temperature: avgIn(samples, "temperature", now - 25 * HOUR, now - 23 * HOUR), humidity: avgIn(samples, "humidity", now - 25 * HOUR, now - 23 * HOUR) } : null,
      now: latest ? { temperature: avgIn(samples, "temperature", now - HOUR, now), humidity: avgIn(samples, "humidity", now - HOUR, now) } : null,
    },
    overnight,
    drop,
    rise,
    control: input.control ?? null,
    missing,
  }
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
const statLine = (label: string, metric: MetricId, s: Stats | null) =>
  s ? `${label}: ${withUnit(metric, s.min)} a ${withUnit(metric, s.max)} (promedio ${withUnit(metric, s.avg)}).` : ""
const tidy = (s: string) => s.replace(/\s+/g, " ").trim()

const MISSING_TEXT: Record<MissingInfo, string> = {
  no_cultivation: "Registrar qué vas a cultivar y en qué etapa está, para poder comparar tus lecturas con un rango objetivo.",
  targets_unconfirmed: "Confirmar los rangos objetivo del cultivo (hoy son los del perfil).",
  profile_not_validated: "Un perfil de especie validado: el que tengo es de ejemplo y no tiene validación científica.",
  no_actuators: "Actuadores instalados: hoy solo observo, no puedo encender ni apagar nada.",
  sensors_limited: "Más sensores: solo mido temperatura y humedad (no CO₂, luz ni sustrato).",
  short_history: "Más horas de mediciones: aún tengo poco historial para ver tendencias.",
}

/** Deterministic answers. `understood: false` marks free text the rules could not place. */
export function answerIntent(intent: Intent, ctx: AssistantContext): AssistantAnswer {
  const done = (text: string, evidence: string[] = [], extra: Partial<AssistantAnswer> = {}): AssistantAnswer =>
    ({ questionId: intent, source: "rules", text: tidy(text), evidence, understood: true, ...extra })
  const now = Date.parse(ctx.generatedAt)
  const cur = ctx.current
  const values = cur
    ? [cur.temperature !== null ? withUnit("temperature", cur.temperature) : null, cur.humidity !== null ? withUnit("humidity", cur.humidity) : null].filter(Boolean).join(" y ")
    : null

  switch (intent) {
    case "status": {
      const crop = ctx.cultivation ? ` Cultivo: ${ctx.cultivation.name}, ${ctx.cultivation.stageLabel.toLowerCase()}.` : ""
      const note = ctx.telemetry.insights.find(i => i.id.startsWith("trend:"))?.text
      return done(`${ctx.summary.headline}${values ? ` Mido ${values}.` : ""} ${ctx.summary.detail}${crop}${note ? ` ${note}` : ""}`, cur ? [`reading:${cur.observedAt}`] : [])
    }
    case "device_connected": {
      const last = ctx.device.lastReadingAt
      const age = last ? agoText(now - Date.parse(last)) : null
      const text = ctx.device.connection === "live" ? `Sí, ${ctx.device.name ?? "tu dispositivo"} está conectado. Última medición ${age}.`
        : ctx.device.connection === "stale" ? `Con señal débil: la última medición fue ${age}.`
        : ctx.device.connection === "offline" ? `No: ${ctx.device.name ?? "tu dispositivo"} dejó de enviar mediciones. ${age ? `La última fue ${age}.` : ""}`
        : "Todavía no puedo confirmarlo: no recibí mediciones."
      return done(text, last ? [`reading:${last}`] : [])
    }
    case "targets_now": {
      const c = ctx.control
      if (!c || c.phase === "none") return done("Todavía no hay un objetivo ambiental definido para la cámara. Dime uno, por ejemplo «humedad entre 75 y 85 %», y lo guardo solo cuando lo confirmes.")
      return done(`El objetivo vigente es ${c.targetsText} (versión ${c.version}, ${c.mode === "simulation" ? "de prueba" : c.mode === "observation" ? "solo observación" : c.mode}). ${c.label} ${c.controller}`)
    }
    case "actuator_log": {
      const c = ctx.control
      if (!c || c.actions.length === 0) return done(`No hay actuaciones registradas. ${ctx.capabilities.actuators === false ? "Además, hoy no hay actuadores conectados: ningún ventilador ni humidificador ha hecho nada real." : ""}`)
      const lines = c.actions.slice(0, 4).map(a => `${hhmm(a.at)} ${a.command === "on" ? "encendería" : "apagaría"} el ${a.actuator.replace("fan_exhaust", "ventilador de extracción").replace("fan_intake", "ventilador de entrada").replace("humidifier", "humidificador")}${a.value !== null ? ` (medición ${num(a.value)})` : ""}`)
      return done(`Estas son decisiones SIMULADAS del controlador; ninguna salida eléctrica se activó. ${lines.join("; ")}.`)
    }
    case "automatic_status": {
      const c = ctx.control
      return done(`No: el modo Automático no está disponible. Hoy no hay actuadores conectados y el firmware no activa ninguna salida. ${c && c.phase !== "none" ? `Modo actual: ${c.mode === "simulation" ? "prueba (simulación)" : "observación"}. ${c.label} ${c.controller}` : "MYKO mide, analiza y recomienda."}`)
    }
    case "set_targets":
      return done("Dime los valores y te muestro exactamente qué cambiaría antes de guardar nada. Por ejemplo: «Prueba una humedad entre 75 y 85 %».")
    case "trend": {
      const t = ctx.telemetry
      if (!t.trend.temperature && !t.trend.humidity) return done("Todavía no tengo suficientes mediciones de la última hora para hablar de tendencia.")
      const lines = t.insights.filter(i => i.id.startsWith("trend:") || i.id.startsWith("variable:")).map(i => i.text)
      const flat = (m: MetricId) => (t.trend[m]?.direction === "flat" ? `${m === "temperature" ? "La temperatura" : "La humedad"} se mantiene estable en la última hora.` : "")
      return done(`${lines.join(" ")} ${flat("temperature")} ${flat("humidity")}`.trim() || "Sin cambios relevantes en la última hora.")
    }
    case "uptime": {
      const u = ctx.uptime
      if (!u.streakStartedAt || ctx.device.connection !== "live") return done(ctx.device.connection === "offline" ? "Ahora mismo no está conectado, así que no hay una conexión en curso." : "Todavía no tengo suficientes mediciones para medir el tiempo conectado.")
      return done(`Lleva ${durationText(u.streakMs)} conectado sin cortes (desde las ${hhmm(u.streakStartedAt)}). ${u.gaps > 0 ? `En las últimas 24 h hubo ${u.gaps} corte${u.gaps === 1 ? "" : "s"} de señal.` : "No registré cortes en las últimas 24 h."}`, [`reading:${u.streakStartedAt}`])
    }
    case "what_to_check": {
      if (ctx.recommendations.length) return done(ctx.recommendations.map(r => `${r.title}: ${r.body}`).join(" "), ctx.findings.map(f => `finding:${f.kind}`))
      return done("Por ahora no tengo nada urgente que revisar: no hay condiciones fuera de rango ni problemas de conexión.")
    }
    case "improve": {
      const parts: string[] = []
      if (ctx.recommendations.length) parts.push(`Primero: ${ctx.recommendations[0]?.title.toLowerCase()}. ${ctx.recommendations[0]?.body}`)
      const wanted = ctx.missing.filter(m => m === "no_cultivation" || m === "targets_unconfirmed" || m === "profile_not_validated").map(m => MISSING_TEXT[m])
      if (wanted.length) parts.push(`Para evaluarte mejor: ${wanted[0]}`)
      const variable = ctx.telemetry.insights.find(i => i.id.startsWith("variable:"))
      if (variable) parts.push(`${variable.text} Estabilizarla suele ser lo que más ayuda.`)
      const h = ctx.window24h.humidity
      if (!variable && h && h.max - h.min >= 15) parts.push(`La humedad varió ${num(h.max - h.min, 0)} puntos en 24 h (${withUnit("humidity", h.min)} a ${withUnit("humidity", h.max)}); estabilizarla suele ser lo que más ayuda.`)
      if (!parts.length) parts.push("Tu ambiente se ve estable con lo que puedo medir. Lo siguiente sería registrar tu cultivo para comparar con un rango objetivo.")
      return done(parts.join(" "), [])
    }
    case "why_humidity":
    case "why_temperature": {
      const metric: MetricId = intent === "why_humidity" ? "humidity" : "temperature"
      const fell = ctx.drop && ctx.drop.metric === metric ? ctx.drop : null
      const rose = ctx.rise && ctx.rise.metric === metric ? ctx.rise : null
      // Report the larger of the two recent moves; both are observations, never causes.
      const d = fell && rose ? (fell.from - fell.to >= rose.to - rose.from ? fell : rose) : fell ?? rose
      const direction = d && d === rose ? "subió" : "bajó"
      const label = metric === "humidity" ? "La humedad" : "La temperatura"
      if (!d) return done(cur && cur[metric] !== null ? `No veo un cambio reciente: ${metric === "humidity" ? "la humedad" : "la temperatura"} está en ${withUnit(metric, cur[metric] as number)}.` : "No tengo mediciones recientes para comparar.")
      const actions = ctx.control?.actions.filter(a => a.at >= d.fromAt) ?? []
      const simulated = actions.length ? ` En ese lapso el controlador simuló ${actions.length} actuación${actions.length === 1 ? "" : "es"} (ninguna real).` : ""
      return done(`${label} ${direction} de ${withUnit(metric, d.from)} (${hhmm(d.fromAt)}) a ${withUnit(metric, d.to)} (${hhmm(d.toAt)}). Eso es lo que medí; solo tengo temperatura y humedad, así que no puedo saber la causa.${simulated} ${direction === "bajó" ? "Puedes revisar el agua del humidificador, que la cámara esté cerrada y la ventilación." : "Puedes revisar si se abrió la cámara, si cambió la ventilación o la temperatura del cuarto."}`, [`reading:${d.fromAt}`, `reading:${d.toAt}`])
    }
    case "overnight": {
      const n = ctx.overnight
      if (!n) return done("No tengo suficientes mediciones de la noche para resumirla.")
      const events = n.events.length ? ` Eventos: ${n.events.map(e => e.title.toLowerCase()).join("; ")}.` : " No hubo alertas."
      return done(`${n.ongoing ? "Esta noche" : "Anoche"} (${hhmm(n.from)}–${hhmm(n.to)}) registré ${n.samples} mediciones. ${statLine("Temperatura", "temperature", n.temperature)} ${statLine("Humedad", "humidity", n.humidity)}${events}`, [`reading:${n.from}`, `reading:${n.to}`])
    }
    case "since_yesterday": {
      const { then, now: current } = ctx.sinceYesterday
      if (!then || !current) return done("Todavía no tengo mediciones de hace un día para comparar.")
      const part = (label: string, metric: MetricId, a: number | null, b: number | null) =>
        a !== null && b !== null ? `${label}: ${metric === "temperature" ? num(a) : num(a, 0)} → ${withUnit(metric, b)} (promedio de la última hora).` : ""
      return done(`Comparado con ayer a esta hora. ${part("Temperatura", "temperature", then.temperature, current.temperature)} ${part("Humedad", "humidity", then.humidity, current.humidity)}`)
    }
    case "species": {
      if (ctx.cultivation) return done(`Ya tienes registrado ${ctx.cultivation.name} (${ctx.cultivation.speciesName}, ${ctx.cultivation.stageLabel.toLowerCase()}). Si quieres cambiar de especie, puedes corregirlo en Cultivo.`)
      if (!ctx.catalog.length) return done("Todavía no tengo perfiles de especie cargados, así que no puedo recomendarte una con respaldo.")
      const first = ctx.catalog[0] as CatalogEntry
      const ex = first.example
      const fit = cur && ex?.temperature && cur.temperature !== null
        ? ` Tu cámara mide hoy ${withUnit("temperature", cur.temperature)}; el rango de ejemplo del perfil es ${rangeText("temperature", ex.temperature)}${cur.temperature > ex.temperature.max ? ", así que probablemente necesitarías enfriar o ventilar" : cur.temperature < ex.temperature.min ? ", así que probablemente necesitarías más calor" : ", y estás dentro"}.`
        : ""
      const others = ctx.catalog.length > 1 ? ` También tengo: ${ctx.catalog.slice(1).map(c => c.name).join(", ")}.` : ""
      return done(`Hoy solo tengo un perfil de especie para acompañarte: ${first.name} (${first.scientificName}). Es una orientación general, no un diagnóstico: ${first.validation === "validated" ? "el perfil está validado" : "el perfil es de ejemplo y no está validado científicamente"}.${fit}${others}`, [], { action: { label: "Empezar con MYKO", href: "/home/cultivo" } })
    }
    case "needs": {
      const lines = ctx.missing.map(m => MISSING_TEXT[m])
      return done(`Para funcionar mejor me falta: ${lines.slice(0, 3).join(" ")}${lines.length > 3 ? ` (y ${lines.length - 3} más en Ajustes)` : ""}`, [], ctx.missing.includes("no_cultivation") ? { action: { label: "Empezar con MYKO", href: "/home/cultivo" } } : {})
    }
    case "start_crop":
      return done(ctx.cultivation ? `Ya hay un cultivo activo (${ctx.cultivation.name}). Para empezar otro primero hay que cerrar el actual en Cultivo.` : "Claro, te acompaño paso a paso: me cuentas qué quieres cultivar y en qué etapa está, y lo registro solo cuando tú lo confirmes.", [], { action: { label: "Empezar con MYKO", href: "/home/cultivo" } })
    case "greeting":
      return done(`Hola. ${ctx.summary.headline} Pregúntame por tu cámara, la noche, la humedad o qué revisar.`)
    default:
      return { questionId: "unknown", source: "rules", understood: false, evidence: [], text: "No estoy seguro de haberte entendido. Puedo contarte cómo está tu cámara, qué ocurrió anoche, por qué cambió la humedad, qué revisar o cómo empezar un cultivo." }
  }
}

/** Free text in, rule-based answer out. */
export function respondWithRules(text: string, ctx: AssistantContext): AssistantAnswer {
  const intent = classifyIntent(text)
  if (intent === "set_targets") return answerTargetRequest(text, ctx)
  return answerIntent(intent, ctx)
}

/**
 * A request to change targets becomes a PROPOSAL with the exact values and every assumption. It saves nothing: the
 * interface asks the person to confirm, and only the device's own report can ever make it "Aplicado".
 */
function answerTargetRequest(text: string, ctx: AssistantContext): AssistantAnswer {
  const request = interpretTargetRequest(text)
  if (!request) return answerIntent("set_targets", ctx)
  if (!request.ok) return { questionId: "set_targets", source: "rules", understood: true, evidence: [], text: request.error }
  const { proposal } = request
  const current = ctx.control?.targetsText ? ` Hoy está vigente: ${ctx.control.targetsText}.` : ""
  const assumptions = proposal.assumptions.length ? ` ${proposal.assumptions.join(" ")}` : ""
  return {
    questionId: "set_targets", source: "rules", understood: true, evidence: [], proposal,
    text: `Esto es lo que cambiaría, como configuración de PRUEBA (simulación): ${describeTargets(proposal.targets)}.${assumptions}${current} MYKO-001 la recibirá y confirmará; no se activa ninguna salida eléctrica. Se guarda solo si lo confirmas.`,
  }
}

/** Backwards-compatible entry for the V1 chips. */
export function answerWithRules(question: QuestionId | Intent, ctx: AssistantContext): AssistantAnswer {
  return answerIntent(question, ctx)
}

export const rulesProvider: AssistantProvider = {
  id: "rules",
  answer: (question, context, text) => (question === "unknown" && text ? respondWithRules(text, context) : answerIntent(question, context)),
}
