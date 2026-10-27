import { DEFAULT_INTELLIGENCE_CONFIG } from "./config"
import { ADJECTIVE, METRIC_NOUN, DIRECTION_TEXT, durationText, rangeText, withUnit } from "./copy.es"
import { detectEpisodes, findSignalGaps, normalizeSeries } from "./series"
import type { ActivityEvent, EnvTargets, IntelligenceConfig, MetricId, ReadingPoint } from "./types"

const METRICS: readonly MetricId[] = ["temperature", "humidity"]

export interface ActivityOptions {
  config?: IntelligenceConfig
  /** A silence longer than this between two samples is reported as lost signal. */
  gapMs?: number
  limit?: number
}

/**
 * The activity timeline is DERIVED from stored readings, so it needs no extra table and can always be
 * recomputed: out-of-range episodes (with hysteresis) and periods without measurements.
 */
export function deriveActivity(
  readings: readonly ReadingPoint[], targets: EnvTargets | null, now: string | number | Date, options: ActivityOptions = {},
): ActivityEvent[] {
  const config = options.config ?? DEFAULT_INTELLIGENCE_CONFIG
  const gapMs = options.gapMs ?? config.freshness.offlineAfterMs
  const samples = normalizeSeries(readings, config)
  const nowMs = new Date(now).getTime()
  const events: ActivityEvent[] = []

  if (targets) {
    for (const metric of METRICS) {
      const range = targets[metric]
      if (!range) continue
      for (const episode of detectEpisodes(samples, metric, range, config)) {
        const ended = episode.endedAt
        const span = (ended ? Date.parse(ended) : nowMs) - Date.parse(episode.startedAt)
        events.push({
          id: episode.id,
          kind: "out_of_range",
          severity: episode.critical ? "critical" : "attention",
          title: `${METRIC_NOUN[metric]} ${ADJECTIVE[metric][episode.direction]}`,
          detail: `${withUnit(metric, episode.extreme)} ${episode.direction === "low" ? "como mínimo" : "como máximo"}, ${DIRECTION_TEXT[episode.direction]} del rango ${rangeText(metric, range)}. ${ended ? `Duró ${durationText(span)}.` : "Continúa."}`,
          startedAt: episode.startedAt,
          endedAt: ended,
        })
      }
    }
  }

  for (const gap of findSignalGaps(samples, gapMs)) {
    events.push({
      id: `signal_lost:${gap.startedAt}`, kind: "signal_lost", severity: "attention",
      title: "MYKO-001 dejó de enviar mediciones",
      detail: `Sin mediciones durante ${durationText(Date.parse(gap.endedAt) - Date.parse(gap.startedAt))}.`,
      startedAt: gap.startedAt, endedAt: gap.endedAt,
    })
  }
  const latest = samples[samples.length - 1]
  if (latest && nowMs - latest.t >= gapMs) {
    events.push({
      id: `signal_lost:${latest.iso}`, kind: "signal_lost", severity: "attention",
      title: "MYKO-001 dejó de enviar mediciones",
      detail: `Sin mediciones desde hace ${durationText(nowMs - latest.t)}.`,
      startedAt: latest.iso, endedAt: null,
    })
  }
  return events.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, options.limit ?? 50)
}
