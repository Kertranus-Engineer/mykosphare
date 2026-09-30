import type { DeviceFreshness, MetricEvaluation } from "../types"
import { GROW_COPY } from "./copy.es"
import { formatHumidity, formatTemperature } from "./format"
import type { GrowTone } from "./status"

export type GrowMetricKind = "temperature" | "humidity"

export interface PresentedMetric {
  kind: GrowMetricKind
  label: string
  /** Formatted value, or the missing placeholder. Never an invented number. */
  value: string
  missing: boolean
  /** True when the value is the last known one rather than a current observation. */
  lastKnown: boolean
  conditionLabel: string
  tone: GrowTone
  rangeLabel: string | null
}

const format = (kind: GrowMetricKind, value: number) =>
  kind === "temperature" ? formatTemperature(value) : formatHumidity(value)

/** Presents an already-evaluated metric. The condition comes from the domain. */
export function presentMetric(
  kind: GrowMetricKind,
  evaluation: MetricEvaluation,
  freshness: DeviceFreshness,
): PresentedMetric {
  const label = GROW_COPY.metrics[kind]
  const rangeLabel = evaluation.target
    ? GROW_COPY.metrics.range(format(kind, evaluation.target.min), format(kind, evaluation.target.max))
    : null

  if (evaluation.value === null) {
    return { kind, label, value: GROW_COPY.metrics.missing, missing: true, lastKnown: false, conditionLabel: GROW_COPY.metrics.missingLabel, tone: "unknown", rangeLabel }
  }

  const value = format(kind, evaluation.value)
  if (freshness !== "live") {
    return { kind, label, value, missing: false, lastKnown: true, conditionLabel: GROW_COPY.metrics.lastKnown, tone: "unknown", rangeLabel }
  }

  const tone: GrowTone =
    evaluation.status === "ok" ? "calm"
      : evaluation.status === "critical" ? "critical"
        : evaluation.status === "unknown" ? "unknown"
          : "attention"

  return { kind, label, value, missing: false, lastKnown: false, conditionLabel: GROW_COPY.metrics.condition[evaluation.status], tone, rangeLabel }
}
