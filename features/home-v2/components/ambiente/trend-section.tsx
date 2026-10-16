"use client"

import { useState } from "react"

import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { MetricId, MetricModel } from "../../data/model"
import { Segmented, tabPanelProps } from "../ui/segmented"
import { TrendChart } from "../ui/trend-chart"
import { Card, EmptyState, ProvenanceBadge, SectionHeading } from "../ui/surface"
import { Activity } from "lucide-react"

const OPTIONS = [
  { id: "temperature", label: COPY.environment.temperature },
  { id: "humidity", label: COPY.environment.humidity },
] as const

/** Interactive session trend for one metric at a time. Never shows a stored history. */
export function TrendSection() {
  const { environment, device } = useHomeV2()
  const [metricId, setMetricId] = useState<MetricId>("temperature")
  const metric: MetricModel | null = environment.status === "ready" ? (environment.metrics.find((m) => m.id === metricId) ?? null) : null
  const count = metric?.series.length ?? 0
  const offline = device.kind === "offline"

  return (
    <section aria-labelledby="hv2-trend-h" className="hv2-block">
      <SectionHeading
        id="hv2-trend-h"
        title={environment.status === "ready" && environment.window === "demo" ? COPY.environmentPage.trendTitleDemo : COPY.environmentPage.trendTitle}
        action={<ProvenanceBadge provenance={environment.status === "ready" ? environment.provenance : "unavailable"} quietSimulated />}
      />
      <Card className="hv2-trend-card">
        <Segmented options={OPTIONS} value={metricId} onChange={setMetricId} label={COPY.environmentPage.trendTitle} idPrefix="hv2-trend" />
        <div {...tabPanelProps("hv2-trend", metricId)} className="hv2-trend-panel" data-dimmed={environment.status === "ready" && environment.dimmed ? "true" : undefined}>
          {metric && count >= 3 ? (
            <>
              <TrendChart key={metric.id} metric={metric} />
              <p className="hv2-caption">{COPY.environmentPage.scrubHint}</p>
            </>
          ) : (
            <EmptyState
              compact
              icon={<Activity className="size-5" />}
              title={offline ? COPY.environmentPage.trendEmptyOffline : COPY.environmentPage.trendEmpty}
            />
          )}
        </div>
        {count >= 3 && <p className="hv2-caption">{environment.status === "ready" && environment.window === "demo" ? COPY.environmentPage.trendNoteDemo(count) : COPY.environmentPage.trendNote(count)}</p>}
      </Card>
    </section>
  )
}
