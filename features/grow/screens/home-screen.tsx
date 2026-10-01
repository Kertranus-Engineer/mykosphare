"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { eventsOfDay, GROW_COPY, presentNeedCue, presentNeeds, presentSenses, presentStatus } from "@/lib/grow/presentation"
import { DataNotices } from "../components/data-notices"
import { FreshnessLine } from "../components/freshness-line"
import { GrowStatus } from "../components/grow-status"
import { GrowTimeline } from "../components/grow-timeline"
import { GrowViewState } from "../components/grow-view-state"
import { MetricPills } from "../components/metric-readout"
import { NeedList } from "../components/need-list"
import { RunHeading } from "../components/run-heading"
import { useGrow } from "../data/grow-provider"
import { growHref } from "../data/grow-request"
import { GlyphMemory } from "../glyphs/grow-glyphs"
import { mykoPresence } from "../myko/presence"
import { MykoStage } from "../myko/myko-stage"

/** "¿Cómo está mi cultivo?" — MYKO is the centre; the status emanates from it. */
export function GrowHomeScreen() {
  const { view, retry, request } = useGrow()
  if (view.status !== "ready") return <GrowViewState view={view} onRetry={retry} />

  const { snapshot, evaluatedAt, timeline, notices } = view
  const status = presentStatus(snapshot, evaluatedAt)
  const needs = presentNeeds(snapshot.state, timeline, evaluatedAt)
  const today = eventsOfDay(timeline, evaluatedAt)

  return (
    <div className="g-home">
      <section className="g-hero" aria-label={GROW_COPY.cultivation.now}>
        <RunHeading snapshot={snapshot} now={evaluatedAt} />
        <MykoStage
          {...mykoPresence(snapshot)}
          cue={presentNeedCue(snapshot.state)}
          size="hero"
          label={`${status.title}. ${GROW_COPY.myko.tapHint}`}
        />
        <div className="g-hero-filament" aria-hidden="true" />
        <GrowStatus status={status} />
        <div className="g-hero-readouts">
          <MetricPills metrics={presentSenses(snapshot)} />
          <FreshnessLine freshness={snapshot.state.freshness} lastReading={status.lastReading} />
          <DataNotices snapshot={snapshot} notices={notices} />
        </div>
      </section>

      <div className="g-home-rest">
        {needs.length > 0 && (
          <section aria-label={GROW_COPY.needs.title}>
            <h2 className="g-section-title">{GROW_COPY.needs.title}</h2>
            <NeedList needs={needs} />
          </section>
        )}
        <section aria-label={GROW_COPY.timeline.title}>
          <h2 className="g-section-title"><GlyphMemory size={16} />{GROW_COPY.timeline.title}</h2>
          <GrowTimeline events={today} now={evaluatedAt} limit={5} emptyText={GROW_COPY.timeline.emptyToday} />
        </section>
        <Link className="g-textlink" href={growHref("/grow/cultivation", request)}>
          {GROW_COPY.cultivation.see}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
