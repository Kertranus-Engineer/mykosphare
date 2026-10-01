"use client"

import {
  cultivationDay,
  eventsOfDay,
  GROW_COPY,
  presentLastLook,
  presentNeedCue,
  presentNeeds,
  presentSenses,
  presentSpecies,
  presentStageJourney,
  presentStatus,
} from "@/lib/grow/presentation"
import { DataNotices } from "../components/data-notices"
import { FreshnessLine } from "../components/freshness-line"
import { GrowTimeline } from "../components/grow-timeline"
import { GrowViewState } from "../components/grow-view-state"
import { LastLook } from "../components/last-look"
import { MetricPills } from "../components/metric-readout"
import { NeedList } from "../components/need-list"
import { StageJourney } from "../components/stage-journey"
import { TechnicalDetails } from "../components/technical-details"
import { ToneMark } from "../components/tone-mark"
import { useGrow } from "../data/grow-provider"
import { GlyphGrowth, GlyphMemory, GlyphObserve } from "../glyphs/grow-glyphs"
import { mykoPresence } from "../myko/presence"
import { MykoStage } from "../myko/myko-stage"

/** Biography of the crop: who it is, where it is in its cycle, how it is now, what happened. */
export function CultivationScreen() {
  const { view, retry } = useGrow()
  if (view.status !== "ready") return <GrowViewState view={view} onRetry={retry} />

  const { snapshot, evaluatedAt, timeline, notices, mode } = view
  const status = presentStatus(snapshot, evaluatedAt)
  const species = presentSpecies(snapshot.profile)
  const day = cultivationDay(snapshot.run.startedAt, evaluatedAt)
  const journey = presentStageJourney(snapshot.state.confirmedStage, snapshot.state.suggestedStage)
  const today = eventsOfDay(timeline, evaluatedAt)
  const earlier = timeline.filter((event) => !today.includes(event))

  return (
    <div className="g-bio">
      <header className="g-bio-hero">
        <MykoStage {...mykoPresence(snapshot)} cue={presentNeedCue(snapshot.state)} size="compact" label={`${status.title}. ${GROW_COPY.myko.tapHint}`} />
        <div>
          <p className="g-kicker">{GROW_COPY.cultivation.title}</p>
          <h1 className="g-bio-name">{species.name}</h1>
          <p className="g-bio-species">
            {species.scientificName}
            {species.isSample && <span className="g-tag" style={{ marginLeft: 8, fontStyle: "normal" }}>{GROW_COPY.species.sampleProfile}</span>}
          </p>
          <div className="g-bio-facts">
            {day !== null && <span><GlyphGrowth size={16} />{GROW_COPY.stage.day(day)}</span>}
            <span><ToneMark tone={status.tone} />{status.title}</span>
          </div>
        </div>
      </header>

      <section aria-label={GROW_COPY.stage.journeyTitle}>
        <h2 className="g-section-title"><GlyphGrowth size={16} />{GROW_COPY.stage.journeyTitle}</h2>
        <StageJourney journey={journey} />
      </section>

      <div className="g-cult-grid">
        <div className="g-bio">
          <section className="g-block" aria-label={GROW_COPY.cultivation.now}>
            <h2 className="g-section-title" style={{ margin: 0 }}>{GROW_COPY.cultivation.now}</h2>
            <div>
              <p className="g-block-status" data-tone={status.tone}>{status.title}</p>
              <p className="g-muted" style={{ margin: "4px 0 0" }}>{status.body}</p>
            </div>
            <MetricPills metrics={presentSenses(snapshot)} showRange />
            <FreshnessLine freshness={snapshot.state.freshness} lastReading={status.lastReading} />
            <DataNotices snapshot={snapshot} notices={notices} />
          </section>

          <section aria-label={GROW_COPY.needs.title}>
            <h2 className="g-section-title">{GROW_COPY.needs.title}</h2>
            <NeedList needs={presentNeeds(snapshot.state, timeline, evaluatedAt)} showHint />
          </section>

          <section aria-label={GROW_COPY.look.title}>
            <h2 className="g-section-title"><GlyphObserve size={16} />{GROW_COPY.look.title}</h2>
            <LastLook look={presentLastLook(null)} now={evaluatedAt} />
          </section>
        </div>

        <div className="g-bio">
          <section aria-label={GROW_COPY.timeline.title}>
            <h2 className="g-section-title"><GlyphMemory size={16} />{GROW_COPY.timeline.title}</h2>
            <GrowTimeline events={today} now={evaluatedAt} emptyText={GROW_COPY.timeline.emptyToday} />
          </section>

          <section aria-label={GROW_COPY.timeline.fullTitle}>
            <h2 className="g-section-title"><GlyphMemory size={16} />{GROW_COPY.timeline.fullTitle}</h2>
            <GrowTimeline events={earlier} now={evaluatedAt} />
          </section>

          {species.isSample && <p className="g-notice">{GROW_COPY.species.sampleProfileBody}</p>}
          <TechnicalDetails snapshot={snapshot} mode={mode} />
        </div>
      </div>
    </div>
  )
}
