"use client"

import { ArrowDownRight, ArrowUpRight, Droplets, Leaf, Minus, Thermometer, WifiOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { MetricModel } from "../../data/model"
import { AnimatedNumber } from "../ui/animated-number"
import { Sparkline } from "../ui/sparkline"
import { Card, Chip, EmptyState, ProvenanceBadge, SectionHeading, Skeleton } from "../ui/surface"

const ICON = { temperature: Thermometer, humidity: Droplets } as const

function trendText(metric: MetricModel): string | null {
  if (metric.trend === null) return null
  if (metric.trend === "flat") return COPY.environment.trendFlat
  const word = metric.trend === "up" ? COPY.environment.trendUp : COPY.environment.trendDown
  return metric.delta !== null && Math.abs(metric.delta) >= 0.05 ? `${word} ${metric.delta > 0 ? "+" : ""}${metric.delta.toFixed(1)}` : word
}

export function MetricTile({ metric, dimmed, showSpark = true }: { metric: MetricModel; dimmed: boolean; showSpark?: boolean }) {
  const Icon = ICON[metric.id]
  const trend = trendText(metric)
  const TrendIcon = metric.trend === "up" ? ArrowUpRight : metric.trend === "down" ? ArrowDownRight : Minus
  return (
    <Card className="hv2-metric" role="group" data-metric={metric.id} data-dimmed={dimmed || undefined} aria-label={metric.label}>
      <div className="hv2-metric-head">
        <span className="hv2-metric-icon" aria-hidden><Icon className="size-[18px]" /></span>
        <span className="hv2-metric-label">{metric.label}</span>
      </div>
      <p className="hv2-metric-value">
        {metric.value === null ? (
          <span className="hv2-metric-empty" aria-label="Sin lectura">{COPY.environment.noValue}</span>
        ) : (
          <>
            <AnimatedNumber value={metric.value} decimals={metric.decimals} className="hv2-metric-number" />
            <span className="hv2-metric-unit">{metric.unit}</span>
          </>
        )}
      </p>
      <div className="hv2-metric-foot">
        {metric.condition && <Chip tone={metric.condition.tone}>{metric.condition.label}</Chip>}
        {trend && (
          <span className={cn("hv2-trend", metric.trend === "flat" && "is-flat")}>
            <TrendIcon aria-hidden className="size-3.5" />
            {trend}
          </span>
        )}
      </div>
      {showSpark && <Sparkline values={metric.series} minSpan={metric.minSpan} className="hv2-metric-spark" label={`${COPY.environment.sessionTrend}: ${metric.label}`} />}
    </Card>
  )
}

export function EnvironmentSection({ title = COPY.home.environmentTitle, showSpark = true }: { title?: string; showSpark?: boolean } = {}) {
  const { environment } = useHomeV2()
  const ready = environment.status === "ready"
  const enoughTrend = !showSpark || (ready && environment.metrics.some((metric) => metric.series.length >= 3))

  return (
    <section aria-labelledby="hv2-env-h" className="hv2-block">
      <SectionHeading
        id="hv2-env-h"
        title={title}
        action={ready ? <ProvenanceBadge provenance={environment.provenance} /> : <ProvenanceBadge provenance="unavailable" />}
      />

      {environment.status === "waiting" ? (
        <Card>
          <EmptyState
            compact
            icon={environment.title === COPY.environment.offlineTitle ? <WifiOff className="size-5" /> : <Leaf className="size-5" />}
            title={environment.title}
            body={environment.detail}
          />
        </Card>
      ) : (
        <>
          <div className="hv2-metric-grid">
            {environment.metrics.map((metric) => (
              <MetricTile key={metric.id} metric={metric} dimmed={environment.dimmed} showSpark={showSpark} />
            ))}
          </div>

          {environment.overall ? (
            <Card className="hv2-state" tone={environment.overall.tone}>
              <span className="hv2-state-icon" aria-hidden><Leaf className="size-5" /></span>
              <div className="hv2-state-text">
                <p className="hv2-state-label">{COPY.environment.stateLabel}</p>
                <p className="hv2-state-value">{environment.overall.label}</p>
                <p className="hv2-state-detail">{environment.overall.detail}</p>
              </div>
            </Card>
          ) : (
            <Skeleton className="hv2-state-skeleton" />
          )}

          {!enoughTrend && <p className="hv2-caption">{COPY.environment.notEnoughTrend}</p>}
        </>
      )}
    </section>
  )
}
