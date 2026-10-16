"use client"

import Link from "next/link"
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

export function MetricTile({ metric, dimmed, showSpark = true, href }: { metric: MetricModel; dimmed: boolean; showSpark?: boolean; href?: string }) {
  const Icon = ICON[metric.id]
  const trend = trendText(metric)
  const TrendIcon = metric.trend === "up" ? ArrowUpRight : metric.trend === "down" ? ArrowDownRight : Minus
  const link = href ? ({ as: Link, href } as const) : ({ role: "group" } as const)
  return (
    <Card className={cn("hv2-metric", href && "hv2-press")} {...link} data-metric={metric.id} data-dimmed={dimmed || undefined} aria-label={metric.label}>
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

/** "Sin dispositivo conectado" / "Conectando…": never a fabricated reading. */
function WaitingState({ compact }: { compact?: boolean }) {
  const { environment } = useHomeV2()
  if (environment.status !== "waiting") return null
  return (
    <Card>
      {environment.reason === "loading" ? (
        <div className="hv2-waiting" aria-busy="true">
          <Skeleton className="hv2-waiting-skeleton" />
          <p className="hv2-caption">{environment.detail}</p>
        </div>
      ) : (
        <EmptyState compact={compact} icon={<WifiOff className="size-5" />} title={environment.title} body={environment.detail} />
      )}
    </Card>
  )
}

/** Full readings block (Ambiente page): both tiles, overall state and sparklines. */
export function EnvironmentSection({ title = COPY.home.environmentTitle, showSpark = true }: { title?: string; showSpark?: boolean } = {}) {
  const { environment } = useHomeV2()
  const ready = environment.status === "ready"
  const enoughTrend = !showSpark || (ready && environment.metrics.some((metric) => metric.series.length >= 3))

  return (
    <section aria-labelledby="hv2-env-h" className="hv2-block">
      <SectionHeading
        id="hv2-env-h"
        title={title}
        action={<ProvenanceBadge provenance={ready ? environment.provenance : "unavailable"} quietSimulated />}
      />

      {environment.status === "waiting" ? (
        <WaitingState compact />
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
