import type { PresentedMetric } from "@/lib/grow/presentation"
import { ToneMark } from "./tone-mark"

export function MetricReadout({ metric, showRange = false }: { metric: PresentedMetric; showRange?: boolean }) {
  return (
    <div className="g-metric" data-missing={metric.missing} data-last-known={metric.lastKnown}>
      <span className="g-eyebrow">{metric.label}</span>
      <span className="g-metric-value" aria-label={metric.missing ? `${metric.label}: ${metric.conditionLabel}` : undefined}>
        {metric.value}
      </span>
      <span className="g-metric-condition">
        <ToneMark tone={metric.tone} />
        {metric.conditionLabel}
      </span>
      {showRange && metric.rangeLabel && <div className="g-metric-range">{metric.rangeLabel}</div>}
    </div>
  )
}

export function MetricPair({ metrics, showRange }: { metrics: PresentedMetric[]; showRange?: boolean }) {
  return (
    <div className="g-metrics">
      {metrics.map((metric) => (
        <MetricReadout key={metric.kind} metric={metric} showRange={showRange} />
      ))}
    </div>
  )
}
