"use client"

import {
  GROW_COPY,
  presentNeeds,
  presentSenses,
  presentStageJourney,
  presentStatus,
} from "@/lib/grow/presentation"
import { DataNotices } from "../components/data-notices"
import { FreshnessLine } from "../components/freshness-line"
import { GrowStatus } from "../components/grow-status"
import { GrowTimeline } from "../components/grow-timeline"
import { GrowViewState } from "../components/grow-view-state"
import { MetricPair } from "../components/metric-readout"
import { NeedList } from "../components/need-list"
import { RunHeading } from "../components/run-heading"
import { StageJourney } from "../components/stage-journey"
import { TechnicalDetails } from "../components/technical-details"
import { useGrow } from "../data/grow-provider"

/** The living record of the run: stage, conditions, needs, history. */
export function CultivationScreen() {
  const { view, retry } = useGrow()
  if (view.status !== "ready") return <GrowViewState view={view} onRetry={retry} />

  const { snapshot, evaluatedAt, timeline, notices, mode } = view
  const status = presentStatus(snapshot, evaluatedAt)
  const journey = presentStageJourney(snapshot.state.confirmedStage, snapshot.state.suggestedStage)

  return (
    <div className="g-stack-lg">
      <header className="g-stack">
        <h1 className="g-eyebrow" style={{ margin: 0 }}>{GROW_COPY.cultivation.title}</h1>
        <RunHeading snapshot={snapshot} now={evaluatedAt} showScientific />
        {snapshot.profile.kind === "sample" && (
          <p className="g-notice" style={{ margin: 0 }}>{GROW_COPY.species.sampleProfileBody}</p>
        )}
      </header>

      <section aria-label={GROW_COPY.stage.journeyTitle}>
        <h2 className="g-section-title">{GROW_COPY.stage.journeyTitle}</h2>
        <StageJourney journey={journey} horizontalOnDesktop />
      </section>

      <div className="g-desktop-columns">
        <div className="g-stack-lg">
          <section className="g-stack" aria-label={GROW_COPY.cultivation.now}>
            <h2 className="g-section-title" style={{ margin: 0 }}>{GROW_COPY.cultivation.now}</h2>
            <GrowStatus status={status} as="h2" />
            <FreshnessLine freshness={snapshot.state.freshness} lastReading={status.lastReading} />
            <DataNotices snapshot={snapshot} notices={notices} />
            <MetricPair metrics={presentSenses(snapshot)} showRange />
          </section>
          <NeedList needs={presentNeeds(snapshot.state)} />
        </div>
        <div className="g-stack-lg">
          <GrowTimeline events={timeline} now={evaluatedAt} title={GROW_COPY.timeline.fullTitle} />
          <TechnicalDetails snapshot={snapshot} mode={mode} />
        </div>
      </div>
    </div>
  )
}
