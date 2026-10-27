import { DEFAULT_INTELLIGENCE_CONFIG } from "./config"
import { num, withUnit } from "./copy.es"
import { normalizeSeries, validValue, type Sample } from "./series"
import type { MetricId, ReadingPoint } from "./types"

/**
 * Telemetry analysis: what the measurements alone say, with no crop, targets or model involved.
 * Everything is a number computed from real readings, plus a sentence that quotes it.
 */
export interface MetricStats { min: number; max: number; avg: number }
export type TrendDirection = "up" | "down" | "flat"
export interface Trend { perHour: number; direction: TrendDirection; spanMs: number }
export interface TelemetryInsight { id: string; metric?: MetricId; text: string }
export interface TelemetryInsights {
  window: { from: string | null; to: string | null; samples: number }
  /** Share of 5-minute slots, between the first and last sample, that contain at least one measurement. */
  coverage: { slots: number; received: number; pct: number }
  range24h: Record<MetricId, MetricStats | null>
  trend: Record<MetricId, Trend | null>
  stability: Record<MetricId, "stable" | "variable" | "unknown">
  dayNight: Record<MetricId, { day: number; night: number } | null>
  insights: TelemetryInsight[]
}

export interface TelemetryConfig {
  /** Slope below which a metric counts as flat, per hour. */
  flatPerHour: Record<MetricId, number>
  /** 24 h spread (max − min) above which a metric counts as variable. */
  variableSpread: Record<MetricId, number>
  /** Day/night average difference worth mentioning. */
  dayNightDiff: Record<MetricId, number>
  trendWindowMs: number
  trendMinSamples: number
  trendMinSpanMs: number
  coverageWarnBelow: number
}
export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  flatPerHour: { temperature: 0.3, humidity: 1.5 },
  variableSpread: { temperature: 3, humidity: 10 },
  dayNightDiff: { temperature: 2, humidity: 8 },
  trendWindowMs: 60 * 60_000,
  trendMinSamples: 6,
  trendMinSpanMs: 20 * 60_000,
  coverageWarnBelow: 90,
}

const SLOT_MS = 5 * 60_000
const HOUR = 3_600_000
const METRICS: readonly MetricId[] = ["temperature", "humidity"]
const LABEL: Record<MetricId, string> = { temperature: "La temperatura", humidity: "La humedad" }

function statsOf(samples: readonly Sample[], metric: MetricId): MetricStats | null {
  const values = samples.map(s => validValue(s, metric)).filter((v): v is number => v !== null)
  if (!values.length) return null
  return { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, b) => a + b, 0) / values.length }
}

/** Least-squares slope in units per hour over the recent window; null when there is not enough evidence. */
function trendOf(samples: readonly Sample[], metric: MetricId, now: number, cfg: TelemetryConfig): Trend | null {
  const pts = samples.filter(s => now - s.t <= cfg.trendWindowMs && validValue(s, metric) !== null)
  if (pts.length < cfg.trendMinSamples) return null
  const first = pts[0] as Sample
  const last = pts[pts.length - 1] as Sample
  const spanMs = last.t - first.t
  if (spanMs < cfg.trendMinSpanMs) return null
  const xs = pts.map(p => (p.t - first.t) / HOUR)
  const ys = pts.map(p => validValue(p, metric) as number)
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = ys.reduce((a, b) => a + b, 0) / ys.length
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  if (den === 0) return null
  const perHour = xs.reduce((a, x, i) => a + (x - mx) * ((ys[i] as number) - my), 0) / den
  const flat = Math.abs(perHour) < cfg.flatPerHour[metric]
  return { perHour, direction: flat ? "flat" : perHour > 0 ? "up" : "down", spanMs }
}

export function analyzeTelemetry(
  readings: readonly ReadingPoint[], now: string | number | Date,
  options: { config?: TelemetryConfig; hourOf?: (ms: number) => number } = {},
): TelemetryInsights {
  const cfg = options.config ?? DEFAULT_TELEMETRY_CONFIG
  const nowMs = new Date(now).getTime()
  const hourOf = options.hourOf ?? ((ms: number) => new Date(ms).getHours())
  const all = normalizeSeries(readings, DEFAULT_INTELLIGENCE_CONFIG)
  const samples = all.filter(s => nowMs - s.t <= 24 * HOUR)
  const first = samples[0]
  const last = samples[samples.length - 1]

  const slots = first && last ? Math.floor((last.t - first.t) / SLOT_MS) + 1 : 0
  const received = new Set(samples.map(s => Math.floor(s.t / SLOT_MS))).size
  const coverage = { slots, received, pct: slots ? Math.round((received / slots) * 100) : 0 }

  const range24h = { temperature: statsOf(samples, "temperature"), humidity: statsOf(samples, "humidity") }
  const trend = { temperature: trendOf(samples, "temperature", nowMs, cfg), humidity: trendOf(samples, "humidity", nowMs, cfg) }
  const stability = {} as TelemetryInsights["stability"]
  const dayNight = {} as TelemetryInsights["dayNight"]
  const insights: TelemetryInsight[] = []

  for (const metric of METRICS) {
    const r = range24h[metric]
    const enough = samples.length >= 24 && !!first && !!last && last.t - first.t >= 6 * HOUR
    stability[metric] = !r || !enough ? "unknown" : r.max - r.min > cfg.variableSpread[metric] ? "variable" : "stable"

    const night = samples.filter(s => { const h = hourOf(s.t); return h >= 22 || h < 7 })
    const day = samples.filter(s => { const h = hourOf(s.t); return h >= 10 && h < 19 })
    const n = statsOf(night, metric)
    const d = statsOf(day, metric)
    dayNight[metric] = n && d && night.length >= 6 && day.length >= 6 ? { day: d.avg, night: n.avg } : null
    const dn = dayNight[metric]
    if (dn && Math.abs(dn.day - dn.night) >= cfg.dayNightDiff[metric]) {
      insights.push({ id: `daynight:${metric}`, metric, text: `${LABEL[metric]} es ${dn.day > dn.night ? "mayor" : "menor"} de día: promedio ${withUnit(metric, dn.day)} frente a ${withUnit(metric, dn.night)} de noche.` })
    }

    const t = trend[metric]
    if (t && t.direction !== "flat") {
      const rate = metric === "temperature" ? `${num(Math.abs(t.perHour))} °C` : `${num(Math.abs(t.perHour))} puntos`
      insights.push({ id: `trend:${metric}`, metric, text: `${LABEL[metric]} ${t.direction === "up" ? "sube" : "baja"} unos ${rate} por hora (última hora).` })
    }
    if (stability[metric] === "variable" && r) {
      insights.push({ id: `variable:${metric}`, metric, text: `${LABEL[metric]} varió de ${withUnit(metric, r.min)} a ${withUnit(metric, r.max)} en 24 h.` })
    }
  }
  if (slots >= 12 && coverage.pct < cfg.coverageWarnBelow) {
    insights.push({ id: "coverage", text: `Recibí el ${coverage.pct} % de las mediciones esperadas; hubo cortes de señal.` })
  }

  return {
    window: { from: first?.iso ?? null, to: last?.iso ?? null, samples: samples.length },
    coverage, range24h, trend, stability, dayNight, insights,
  }
}
