"use client"

import {
  GROW_COPY,
  presentDevelopment,
  presentHistory,
  presentNeedCue,
  presentSenseCapabilities,
  presentSpecies,
  presentStatus,
} from "@/lib/grow/presentation"
import { FormTrack } from "../components/form-track"
import { GrowViewState } from "../components/grow-view-state"
import { SenseList } from "../components/sense-list"
import { ToneMark } from "../components/tone-mark"
import { useGrow } from "../data/grow-provider"
import { GlyphGrowth, GlyphMemory, GlyphSense } from "../glyphs/grow-glyphs"
import { mykoPresence } from "../myko/presence"
import { MykoStage } from "../myko/myko-stage"

/** Profile of the digital organism: its senses, its development, its history. */
export function MykoScreen() {
  const { view, retry } = useGrow()
  if (view.status !== "ready") return <GrowViewState view={view} onRetry={retry} />

  const { snapshot, evaluatedAt, timeline } = view
  const status = presentStatus(snapshot, evaluatedAt)
  const species = presentSpecies(snapshot.profile)
  const development = presentDevelopment(snapshot, evaluatedAt)
  const history = presentHistory(snapshot, timeline, evaluatedAt)

  return (
    <div className="g-profile">
      <section className="g-profile-hero" aria-label={GROW_COPY.myko.name}>
        <MykoStage {...mykoPresence(snapshot)} cue={presentNeedCue(snapshot.state)} size="profile" label={`${status.title}. ${GROW_COPY.myko.tapHint}`} />
        <h1 className="g-profile-name">{GROW_COPY.myko.name}</h1>
        <p className="g-profile-of">{GROW_COPY.myko.organismOf(species.name)}</p>
        <p className="g-crop-meta">
          <GlyphGrowth size={16} />
          {development.stage}
          {development.day !== null && ` · ${GROW_COPY.stage.day(development.day)}`}
        </p>
        <p className="g-profile-status" data-tone={status.tone} style={{ margin: "10px 0 0" }}>
          <ToneMark tone={status.tone} />
          <span className="g-muted" style={{ fontWeight: 500 }}>{GROW_COPY.myko.statusLabel}:</span> {status.title}
        </p>
      </section>

      <div className="g-profile-cols">
        <section aria-label={GROW_COPY.senses.title}>
          <h2 className="g-section-title"><GlyphSense size={16} />{GROW_COPY.senses.title}</h2>
          <p className="g-muted" style={{ margin: "-4px 0 14px", fontSize: "0.9rem" }}>{GROW_COPY.senses.intro}</p>
          <SenseList senses={presentSenseCapabilities(snapshot)} />
        </section>

        <section aria-label={GROW_COPY.development.title}>
          <h2 className="g-section-title"><GlyphGrowth size={16} />{GROW_COPY.development.title}</h2>
          <FormTrack development={development} model={snapshot.myko} identity={snapshot.run.id} />
          <dl className="g-stats" style={{ marginTop: 18 }}>
            <div className="g-stat"><dt>{GROW_COPY.development.currentForm}</dt><dd style={{ fontSize: "1.3rem", fontWeight: 500 }}>{development.currentFormName}</dd></div>
            <div className="g-stat"><dt>{GROW_COPY.development.confirmedStage}</dt><dd style={{ fontSize: "1.3rem", fontWeight: 500 }}>{development.stage}</dd></div>
          </dl>
          <p className="g-muted" style={{ margin: "12px 0 0", fontSize: "0.86rem" }}>{GROW_COPY.development.note}</p>
        </section>

        {history.stats.length > 0 && (
          <section aria-label={GROW_COPY.history.title}>
            <h2 className="g-section-title"><GlyphMemory size={16} />{GROW_COPY.history.title}</h2>
            <dl className="g-stats">
              {history.stats.map((stat) => (
                <div key={stat.key} className="g-stat"><dt>{stat.label}</dt><dd>{stat.value}</dd></div>
              ))}
            </dl>
            {history.includesSimulated && <p className="g-notice" data-kind="simulation" style={{ marginTop: 12 }}>{GROW_COPY.history.simulated}</p>}
          </section>
        )}

        <p className="g-muted" style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.5 }}>{GROW_COPY.myko.honesty}</p>
      </div>
    </div>
  )
}
