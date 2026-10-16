"use client"

import Link from "next/link"
import { ChevronRight, WifiOff } from "lucide-react"

import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { labHref, LAB_ROUTES } from "../../data/lab-request"
import { Card, SectionHeading, Skeleton } from "../ui/surface"
import { MetricTile } from "./environment-section"

/** Inicio's environment block: the two premium readings (value, state, trend, mini chart). Detail lives in Ambiente. */
export function EnvironmentSummary() {
  const { environment, request } = useHomeV2()
  const environmentHref = labHref(LAB_ROUTES.environment, request)

  return (
    <section aria-labelledby="hv2-summary-h" className="hv2-block">
      <SectionHeading
        id="hv2-summary-h"
        title={COPY.home.environmentTitle}
        action={
          <Link href={environmentHref} className="hv2-section-link hv2-press" aria-label={COPY.home.viewEnvironment}>
            {COPY.home.seeAll}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        }
      />
      {environment.status === "waiting" ? (
        <Card className="hv2-summary">
          {environment.reason === "loading" ? (
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
            </div>
          )}
        </Card>
      ) : (
        <div className="hv2-metric-grid">
          {environment.metrics.map((metric) => (
            <MetricTile key={metric.id} metric={metric} dimmed={environment.dimmed} href={environmentHref} />
          ))}
        </div>
      )}
    </section>
  )
}
