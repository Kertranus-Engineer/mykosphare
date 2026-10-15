"use client"

import Link from "next/link"
import { ChevronRight, Droplets, Thermometer, WifiOff } from "lucide-react"

import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { labHref, LAB_ROUTES } from "../../data/lab-request"
import type { MetricModel } from "../../data/model"
import { AnimatedNumber } from "../ui/animated-number"
import { Card, Chip, ProvenanceBadge, SectionHeading, Skeleton } from "../ui/surface"

const ICON = { temperature: Thermometer, humidity: Droplets } as const

function Reading({ metric }: { metric: MetricModel }) {
  const Icon = ICON[metric.id]
  return (
    <div className="hv2-reading" data-metric={metric.id}>
      <span className="hv2-reading-label"><Icon aria-hidden className="size-4" />{metric.label}</span>
      <p className="hv2-reading-value">
        {metric.value === null ? (
          <span className="hv2-metric-empty" aria-label="Sin lectura">{COPY.environment.noValue}</span>
        ) : (
          <>
            <AnimatedNumber value={metric.value} decimals={metric.decimals} className="hv2-reading-number" />
            <span className="hv2-reading-unit">{metric.unit}</span>
          </>
        )}
      </p>
    </div>
  )
}

/** Compact environment block for Inicio: two values and the overall state. Everything else lives in Ambiente. */
export function EnvironmentSummary() {
  const { environment, request } = useHomeV2()
  const ready = environment.status === "ready"

  return (
    <section aria-labelledby="hv2-summary-h" className="hv2-block">
      <SectionHeading
        id="hv2-summary-h"
        title={COPY.home.environmentTitle}
        action={ready ? <ProvenanceBadge provenance={environment.provenance} /> : undefined}
      />
      <Card as={Link} href={labHref(LAB_ROUTES.environment, request)} className="hv2-summary hv2-press" aria-label={COPY.home.viewEnvironment}>
        {environment.status === "waiting" ? (
          environment.reason === "loading" ? (
            <div className="hv2-summary-wait" aria-busy="true">
              <Skeleton className="hv2-waiting-skeleton" />
              <p className="hv2-caption">{environment.detail}</p>
            </div>
          ) : (
            <div className="hv2-summary-wait">
              <span className="hv2-summary-wait-icon" aria-hidden><WifiOff className="size-5" /></span>
              <div>
                <p className="hv2-summary-wait-title">{environment.title}</p>
                <p className="hv2-caption">{environment.detail}</p>
              </div>
              <ChevronRight aria-hidden className="hv2-summary-go size-5" />
            </div>
          )
        ) : (
          <>
            <div className="hv2-summary-readings" data-dimmed={environment.dimmed || undefined}>
              {environment.metrics.map((metric) => (
                <Reading key={metric.id} metric={metric} />
              ))}
              <ChevronRight aria-hidden className="hv2-summary-go size-5" />
            </div>
            {environment.overall && (
              <div className="hv2-summary-state">
                <Chip tone={environment.overall.tone}>{environment.overall.label}</Chip>
                <span className="hv2-summary-state-detail">{environment.overall.detail}</span>
              </div>
            )}
          </>
        )}
      </Card>
    </section>
  )
}
