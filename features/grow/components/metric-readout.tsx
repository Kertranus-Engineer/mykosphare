import type { PresentedMetric } from "@/lib/grow/presentation"
import { GrowIcon } from "../glyphs/grow-glyphs"
import { ToneMark } from "./tone-mark"

/** Metric as a quiet capsule: semantic icon, number, domain condition. */
export function MetricPill({ metric, showRange = false }: { metric: PresentedMetric; showRange?: boolean }) {
  return (
    <div className="g-pill" data-tone={metric.tone} data-dim={metric.missing || metric.lastKnown}>
      <span className="g-pill-icon" data-domain={metric.domain}>
        <GrowIcon icon={metric.icon} size={20} />
      </span>
      <span className="g-pill-value" aria-label={`${metric.label}: ${metric.missing ? metric.conditionLabel : metric.value}`}>
        {metric.value}
      </span>
      <span className="g-pill-caption">
        <ToneMark tone={metric.tone} />
        {metric.conditionLabel}
      </span>
      {showRange && metric.rangeLabel && <span className="g-pill-range">{metric.rangeLabel}</span>}
    </div>
  )
}

export function MetricPills({ metrics, showRange }: { metrics: PresentedMetric[]; showRange?: boolean }) {
  return (
    <div className="g-pills">
      {metrics.map((metric) => (
        <MetricPill key={metric.kind} metric={metric} showRange={showRange} />
      ))}
    </div>
  )
}
