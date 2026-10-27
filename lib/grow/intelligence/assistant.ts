import { agoText, num, withUnit } from "./copy.es"
import { normalizeSeries, validValue, type Sample } from "./series"
import { DEFAULT_INTELLIGENCE_CONFIG } from "./config"
import type { ActivityEvent, EnvTargets, IntelligenceReport, MetricId, ReadingPoint, Summary } from "./types"

/**
 * MYKO ASSISTANT — provider-agnostic context layer.
 *
 * `buildAssistantContext` projects real, already-computed facts into a small allow-listed structure
 * (no ids, keys, owner data or hardware identifiers). Any provider can consume it later; today the
 * only provider is `rulesProvider`, which answers from the data and says so. No model is called here
 * and no AI key exists in the frontend.
 */
export interface Stats { min: number; max: number; avg: number; count: number }
export interface AssistantContext {
  schemaVersion: 1
  generatedAt: string
  device: { name: string | null; connection: IntelligenceReport["connection"]; lastReadingAt: string | null }
  current: IntelligenceReport["current"]
  targets: EnvTargets | null
  stageLabel: string | null
  autonomyMode: "monitor"
  summary: Summary
  findings: { kind: string; severity: string; metric?: MetricId; since?: string }[]
  recommendations: { title: string; body: string }[]
  events: ActivityEvent[]
  window24h: { samples: number; temperature: Stats | null; humidity: Stats | null }
  sinceYesterday: { then: { temperature: number | null; humidity: number | null } | null; now: { temperature: number | null; humidity: number | null } | null }
  overnight: { from: string; to: string; ongoing: boolean; samples: number; temperature: Stats | null; humidity: Stats | null; events: ActivityEvent[] } | null
  humidityDrop: { from: number; to: number; fromAt: string; toAt: string } | null
}

export type QuestionId = "status" | "why_humidity" | "overnight" | "what_to_check" | "device_connected" | "since_yesterday"
export const QUESTIONS: { id: QuestionId; label: string }[] = [
  { id: "status", label: "¿Cómo está mi cultivo?" },
  { id: "why_humidity", label: "¿Por qué bajó la humedad?" },
  { id: "overnight", label: "¿Qué ocurrió durante la noche?" },
  { id: "what_to_check", label: "¿Qué debería revisar?" },
  { id: "device_connected", label: "¿Mi dispositivo sigue conectado?" },
  { id: "since_yesterday", label: "¿Qué ha cambiado desde ayer?" },
]

export interface AssistantAnswer {
  questionId: QuestionId
  /** Always disclosed: where the words came from. */
  source: "rules" | "model"
  text: string
  evidence: string[]
}

export interface AssistantProvider {
  id: string
  answer(question: QuestionId, context: AssistantContext): Promise<AssistantAnswer> | AssistantAnswer
}

const HOUR = 3_600_000

function stats(samples: readonly Sample[], metric: MetricId): Stats | null {
  const values = samples.map(s => validValue(s, metric)).filter((v): v is number => v !== null)
  if (!values.length) return null
  return { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, b) => a + b, 0) / values.length, count: values.length }
}
const avgIn = (samples: readonly Sample[], metric: MetricId, from: number, to: number) => {
  const part = samples.filter(s => s.t >= from && s.t <= to)
  return stats(part, metric)?.avg ?? null
}

export interface BuildContextInput {
  report: IntelligenceReport
  /** Up to 24 h of real readings (5-minute averages are fine). */
  history: readonly ReadingPoint[]
  events: readonly ActivityEvent[]
  now: string | number | Date
  deviceName?: string | null
  stageLabel?: string | null
  /** Hour of day (0–23) in the person's local time. Injectable for tests. */
  hourOf?: (ms: number) => number
}

export function buildAssistantContext(input: BuildContextInput): AssistantContext {
  const now = new Date(input.now).getTime()
  const samples = normalizeSeries(input.history, DEFAULT_INTELLIGENCE_CONFIG)
  const hourOf = input.hourOf ?? ((ms: number) => new Date(ms).getHours())
  const last24 = samples.filter(s => now - s.t <= 24 * HOUR)

  // The most recent night (22:00–07:00 local), possibly still in progress.
  const inNight = (ms: number) => { const h = hourOf(ms); return h >= 22 || h < 7 }
  const nightSamples = last24.filter(s => inNight(s.t))
  const ongoing = inNight(now)
  const overnight = nightSamples.length >= 3
    ? {
        from: nightSamples[0]?.iso ?? "", to: nightSamples[nightSamples.length - 1]?.iso ?? "", ongoing, samples: nightSamples.length,
        temperature: stats(nightSamples, "temperature"), humidity: stats(nightSamples, "humidity"),
        events: input.events.filter(e => inNight(Date.parse(e.startedAt)) && now - Date.parse(e.startedAt) <= 24 * HOUR),
      }
    : null

  const latest = samples[samples.length - 1]
  let humidityDrop: AssistantContext["humidityDrop"] = null
  if (latest) {
    const latestHumidity = validValue(latest, "humidity")
    const recent = samples.filter(s => now - s.t <= 6 * HOUR && s.t < latest.t && validValue(s, "humidity") !== null)
    const peak = recent.reduce<Sample | null>((best, s) => (best === null || (validValue(s, "humidity") as number) > (validValue(best, "humidity") as number) ? s : best), null)
    if (latestHumidity !== null && peak) {
      const from = validValue(peak, "humidity") as number
      if (from - latestHumidity >= 5) humidityDrop = { from, to: latestHumidity, fromAt: peak.iso, toAt: latest.iso }
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date(now).toISOString(),
    device: { name: input.deviceName ?? null, connection: input.report.connection, lastReadingAt: latest?.iso ?? null },
    current: input.report.current,
    targets: input.report.targets,
    stageLabel: input.stageLabel ?? null,
    autonomyMode: "monitor",
    summary: input.report.summary,
    findings: input.report.findings.map(f => ({ kind: f.kind, severity: f.severity, metric: f.metric, since: f.since })),
    recommendations: input.report.recommendations.map(r => ({ title: r.title, body: r.body })),
    events: [...input.events],
    window24h: { samples: last24.length, temperature: stats(last24, "temperature"), humidity: stats(last24, "humidity") },
    sinceYesterday: {
      then: samples.some(s => now - s.t >= 22 * HOUR && now - s.t <= 26 * HOUR)
        ? { temperature: avgIn(samples, "temperature", now - 25 * HOUR, now - 23 * HOUR), humidity: avgIn(samples, "humidity", now - 25 * HOUR, now - 23 * HOUR) } : null,
      now: latest ? { temperature: avgIn(samples, "temperature", now - HOUR, now), humidity: avgIn(samples, "humidity", now - HOUR, now) } : null,
    },
    overnight,
    humidityDrop,
  }
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })

function statLine(label: string, metric: MetricId, s: Stats | null) {
  return s ? `${label}: ${withUnit(metric, s.min)} a ${withUnit(metric, s.max)} (promedio ${withUnit(metric, s.avg)}).` : ""
}

export function answerWithRules(question: QuestionId, ctx: AssistantContext): AssistantAnswer {
  const done = (text: string, evidence: string[] = []): AssistantAnswer => ({ questionId: question, source: "rules", text, evidence })
  const now = Date.parse(ctx.generatedAt)

  switch (question) {
    case "status": {
      const values = ctx.current
        ? [ctx.current.temperature !== null ? withUnit("temperature", ctx.current.temperature) : null, ctx.current.humidity !== null ? withUnit("humidity", ctx.current.humidity) : null].filter(Boolean).join(" y ")
        : null
      return done(`${ctx.summary.headline}${values ? ` Ahora mido ${values}.` : ""} ${ctx.summary.detail}`.trim(), ctx.current ? [`reading:${ctx.current.observedAt}`] : [])
    }
    case "device_connected": {
      const last = ctx.device.lastReadingAt
      const age = last ? agoText(now - Date.parse(last)) : null
      const text = ctx.device.connection === "live" ? `Sí, ${ctx.device.name ?? "tu dispositivo"} está conectado. Última medición ${age}.`
        : ctx.device.connection === "stale" ? `Con señal débil: última medición ${age}.`
        : ctx.device.connection === "offline" ? `No: ${ctx.device.name ?? "tu dispositivo"} dejó de enviar mediciones. ${age ? `La última fue ${age}.` : ""}`
        : "Todavía no puedo confirmarlo: no recibí mediciones."
      return done(text, last ? [`reading:${last}`] : [])
    }
    case "what_to_check": {
      if (ctx.recommendations.length) return done(ctx.recommendations.map(r => `${r.title}: ${r.body}`).join(" "), ctx.findings.map(f => `finding:${f.kind}`))
      return done("Por ahora no tengo nada que revisar: no hay condiciones fuera de rango ni problemas de conexión.", [])
    }
    case "why_humidity": {
      const drop = ctx.humidityDrop
      if (!drop) return done(ctx.current?.humidity != null ? `No veo una caída reciente de humedad: ahora está en ${withUnit("humidity", ctx.current.humidity)}.` : "No tengo mediciones recientes de humedad para comparar.", [])
      return done(`La humedad bajó de ${withUnit("humidity", drop.from)} (${hhmm(drop.fromAt)}) a ${withUnit("humidity", drop.to)} (${hhmm(drop.toAt)}). Solo mido temperatura y humedad, así que no puedo saber la causa. Puedes revisar el agua del humidificador, que la cámara esté cerrada y la ventilación.`,
        [`reading:${drop.fromAt}`, `reading:${drop.toAt}`])
    }
    case "overnight": {
      const n = ctx.overnight
      if (!n) return done("No tengo suficientes mediciones de la noche para resumirla.", [])
      const events = n.events.length ? ` Eventos: ${n.events.map(e => e.title.toLowerCase()).join("; ")}.` : " No hubo alertas."
      return done(`${n.ongoing ? "Esta noche" : "Anoche"} (${hhmm(n.from)}–${hhmm(n.to)}) registré ${n.samples} mediciones. ${statLine("Temperatura", "temperature", n.temperature)} ${statLine("Humedad", "humidity", n.humidity)}${events}`.replace(/\s+/g, " ").trim(), [`reading:${n.from}`, `reading:${n.to}`])
    }
    case "since_yesterday": {
      const { then, now: current } = ctx.sinceYesterday
      if (!then || !current) return done("Todavía no tengo mediciones de hace un día para comparar.", [])
      const part = (label: string, metric: MetricId, a: number | null, b: number | null) =>
        a !== null && b !== null ? `${label}: ${metric === "temperature" ? num(a) : num(a, 0)} → ${withUnit(metric, b)} (promedio de la última hora).` : ""
      return done(`Comparado con ayer a esta hora. ${part("Temperatura", "temperature", then.temperature, current.temperature)} ${part("Humedad", "humidity", then.humidity, current.humidity)}`.replace(/\s+/g, " ").trim(), [])
    }
  }
}

export const rulesProvider: AssistantProvider = { id: "rules", answer: answerWithRules }
