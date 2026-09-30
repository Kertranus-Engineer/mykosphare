"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { GROW_COPY, presentSenses, presentStatus } from "@/lib/grow/presentation"
import { DataNotices } from "../components/data-notices"
import { FreshnessLine } from "../components/freshness-line"
import { GrowStatus } from "../components/grow-status"
import { GrowTimeline } from "../components/grow-timeline"
import { GrowViewState } from "../components/grow-view-state"
import { MetricPair } from "../components/metric-readout"
import { RunHeading } from "../components/run-heading"
import { useGrow } from "../data/grow-provider"
import { growHref } from "../data/grow-request"
import { MykoRenderer } from "../myko/myko-renderer"

/** "¿Cómo está mi cultivo?" — answerable at a glance. */
export function GrowHomeScreen() {
  const { view, retry, request } = useGrow()
  if (view.status !== "ready") return <GrowViewState view={view} onRetry={retry} />

  const { snapshot, evaluatedAt, timeline, notices } = view
  const status = presentStatus(snapshot, evaluatedAt)

  return (
    <div className="g-home">
      <section className="g-home-top" aria-label={GROW_COPY.cultivation.now}>
        <div className="g-area-head">
          <RunHeading snapshot={snapshot} now={evaluatedAt} />
        </div>
        <div className="g-area-myko">
          <div className="g-hero-myko">
            <MykoRenderer model={snapshot.myko} />
          </div>
        </div>
        <div className="g-area-text">
          <GrowStatus status={status} />
          <FreshnessLine freshness={snapshot.state.freshness} lastReading={status.lastReading} />
          <DataNotices snapshot={snapshot} notices={notices} />
          <MetricPair metrics={presentSenses(snapshot)} />
          <Link className="g-button" href={growHref("/grow/cultivation", request)}>
            {GROW_COPY.cultivation.see}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <GrowTimeline events={timeline} now={evaluatedAt} limit={4} />
    </div>
  )
}
