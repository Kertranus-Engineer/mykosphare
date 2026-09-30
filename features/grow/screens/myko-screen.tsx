"use client"

import {
  GROW_COPY,
  presentKnowledge,
  presentNeeds,
  presentSenses,
  presentStatus,
  UNOBSERVED_CAPABILITIES,
} from "@/lib/grow/presentation"
import { FreshnessLine } from "../components/freshness-line"
import { GrowStatus } from "../components/grow-status"
import { GrowViewState } from "../components/grow-view-state"
import { NeedList } from "../components/need-list"
import { ToneMark } from "../components/tone-mark"
import { useGrow } from "../data/grow-provider"
import { MykoRenderer } from "../myko/myko-renderer"

/** MYKO-centred view: what it senses, needs, knows, and cannot observe yet. */
export function MykoScreen() {
  const { view, retry } = useGrow()
  if (view.status !== "ready") return <GrowViewState view={view} onRetry={retry} />

  const { snapshot, evaluatedAt } = view
  const status = presentStatus(snapshot, evaluatedAt)
  const senses = presentSenses(snapshot)

  return (
    <div className="g-home">
      <section className="g-home-top" aria-label={GROW_COPY.nav.myko}>
        <div className="g-area-head">
          <p className="g-eyebrow" style={{ margin: 0 }}>{GROW_COPY.nav.myko}</p>
        </div>
        <div className="g-area-myko">
          <div className="g-hero-myko g-hero-myko-lg">
            <MykoRenderer model={snapshot.myko} />
          </div>
        </div>
        <div className="g-area-text">
          <GrowStatus status={status} />
          <FreshnessLine freshness={snapshot.state.freshness} lastReading={status.lastReading} />
        </div>
      </section>

      <div className="g-desktop-columns">
        <div className="g-stack-lg">
          <section aria-label={GROW_COPY.myko.senseTitle}>
            <h2 className="g-section-title">{GROW_COPY.myko.senseTitle}</h2>
            <ul className="g-list-plain">
              {senses.map((sense) => (
                <li key={sense.kind} className="g-fact">
                  <ToneMark tone={sense.tone} />
                  <span>
                    <strong style={{ color: "var(--g-text)", fontWeight: 600 }}>{sense.label}</strong>
                    {" · "}
                    {sense.missing ? GROW_COPY.myko.notReceiving : `${sense.value} · ${sense.conditionLabel}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <NeedList needs={presentNeeds(snapshot.state)} />
          <section aria-label={GROW_COPY.myko.knowTitle}>
            <h2 className="g-section-title">{GROW_COPY.myko.knowTitle}</h2>
            <ul className="g-list-plain">
              {presentKnowledge(snapshot, evaluatedAt).map((fact) => (
                <li key={fact} className="g-fact"><ToneMark tone="calm" />{fact}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="g-stack-lg">
          <section aria-label={GROW_COPY.myko.cannotTitle}>
            <h2 className="g-section-title">{GROW_COPY.myko.cannotTitle}</h2>
            <ul className="g-list-plain">
              {UNOBSERVED_CAPABILITIES.map((capability) => (
                <li key={capability.key} className="g-card" style={{ padding: "14px 16px" }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{capability.title}</p>
                  <p className="g-muted" style={{ margin: "4px 0 0", lineHeight: 1.45 }}>{capability.body}</p>
                </li>
              ))}
            </ul>
          </section>
          <p className="g-muted" style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.5 }}>{GROW_COPY.myko.honesty}</p>
        </div>
      </div>
    </div>
  )
}
