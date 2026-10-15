"use client"

import { Activity } from "lucide-react"

import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { TrendChart } from "../ui/trend-chart"
import { Card, EmptyState } from "../ui/surface"

/** Both measured quantities, stacked. Same session-only data as Ambiente. */
export function ChartsTab() {
  const { environment, device } = useHomeV2()
  const metrics = environment.status === "ready" ? environment.metrics : []
  const plotted = metrics.filter((metric) => metric.series.length >= 3)

  if (plotted.length === 0) {
    return (
      <Card>
        <EmptyState
          compact
          icon={<Activity className="size-5" />}
          title={device.kind === "offline" ? COPY.environmentPage.trendEmptyOffline : COPY.environmentPage.trendEmpty}
        />
      </Card>
    )
  }

  return (
    <div className="hv2-stack hv2-stack--tight">
      {plotted.map((metric) => (
        <Card key={metric.id} className="hv2-trend-card" data-metric={metric.id}>
          <h2 className="hv2-eyebrow">{metric.label}</h2>
          <TrendChart metric={metric} />
        </Card>
      ))}
      <p className="hv2-caption">{COPY.historyPage.chartsNote} {COPY.environmentPage.scrubHint}</p>
    </div>
  )
}
