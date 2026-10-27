import type { MetricId, Range } from "./types"

/** Spanish presentation text for MYKO Intelligence. Plain language, no diagnoses, no invented causes. */
export const METRIC_LABEL: Record<MetricId, string> = { temperature: "temperatura", humidity: "humedad" }
export const METRIC_NOUN: Record<MetricId, string> = { temperature: "La temperatura", humidity: "La humedad" }

export function num(value: number, decimals = 1): string {
  return value.toFixed(decimals).replace(".", ",")
}

export function withUnit(metric: MetricId, value: number): string {
  return metric === "temperature" ? `${num(value)} °C` : `${num(value, 0)} %`
}

export function rangeText(metric: MetricId, range: Range): string {
  return metric === "temperature" ? `${num(range.min, 0)}–${num(range.max, 0)} °C` : `${num(range.min, 0)}–${num(range.max, 0)} %`
}

export function agoText(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `hace ${seconds} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`
  return `hace ${Math.floor(hours / 24)} d`
}

export function durationText(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`
}

export const DIRECTION_TEXT = { low: "por debajo", high: "por encima" } as const
export const ADJECTIVE = {
  temperature: { low: "baja", high: "elevada" },
  humidity: { low: "baja", high: "elevada" },
} as const
