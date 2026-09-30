import { GROW_COPY } from "./copy.es"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Human relative age of an observation, evaluated against an injected `now`. */
export function relativeAgo(timestamp: string, now: string | Date): string | null {
  const at = new Date(timestamp).getTime()
  const ref = new Date(now).getTime()
  if (!Number.isFinite(at) || !Number.isFinite(ref)) return null
  const age = Math.max(0, ref - at)
  if (age < MINUTE) return GROW_COPY.time.justNow
  if (age < HOUR) return GROW_COPY.time.minutes(Math.floor(age / MINUTE))
  if (age < DAY) return GROW_COPY.time.hours(Math.floor(age / HOUR))
  return GROW_COPY.time.days(Math.floor(age / DAY))
}

/** Display formatting only. Rounding here never feeds any evaluation. */
export function formatTemperature(value: number): string {
  return `${value.toFixed(1)}°`
}

export function formatHumidity(value: number): string {
  return `${Math.round(value)}%`
}
