"use client"

import Link from "next/link"
import { useState } from "react"
import { GROW_DEMO_SCENARIOS } from "@/lib/grow/demo/simulation-demo"
import { GROW_COPY, type MykoLiveActivity } from "@/lib/grow/presentation"
import type { MykoForm, MykoMood } from "@/lib/grow/types"
import { GrowIcon } from "../glyphs/grow-glyphs"
import { EvolutionPreview } from "../lab/evolution-preview"
import { LAB_ALL_SENSES, LAB_FORMS, LAB_INDIVIDUALS, LAB_MOODS, visualFixture } from "../lab/visual-fixtures"
import { MykoRenderer } from "../myko/myko-renderer"
import { MykoStage } from "../myko/myko-stage"
import { deriveMykoTraits } from "../myko/traits"

const GLYPHS = ["myko", "mycelium", "growth", "observe", "memory", "event", "sense", "temperature", "humidity", "signal-off"] as const
const FORM_NAMES: Record<MykoForm, string> = { early: "Espora", emerging: "Brote", mature: "Madurez", complete: "Plenitud" }
const ACTIVITIES: ReadonlyArray<{ activity: MykoLiveActivity; mood: MykoMood; note: string }> = [
  { activity: "idle", mood: "content", note: "idle" },
  { activity: "sensing", mood: "content", note: "sensing (new reading)" },
  { activity: "recovering", mood: "content", note: "recovering" },
  { activity: "touched", mood: "content", note: "touched" },
  { activity: "waiting", mood: "uncertain", note: "offline → mood uncertain" },
]
const [REFERENCE] = LAB_INDIVIDUALS
/** Offline: installed senses exist but are not sensing. */
const QUIET_SENSES = LAB_ALL_SENSES.slice(0, 2).map((sense) => ({ ...sense, state: "quiet" as const }))

/** VISUAL DEVELOPMENT ONLY. Not linked from navigation; 404 in production. */
export function LabScreen() {
  const [individualForm, setIndividualForm] = useState<MykoForm>("mature")
  const [replay, setReplay] = useState(0)
  const [still, setStill] = useState(false)

  return (
    <div className="g-lab">
      <h1 className="g-section-title" style={{ margin: 0 }}>{GROW_COPY.lab.title}</h1>
      <p className="g-lab-banner">{GROW_COPY.lab.banner}</p>
      <label className="g-lab-toggle">
        <input type="checkbox" checked={still} onChange={(event) => setStill(event.target.checked)} data-lab="still" />
        Preview reduced motion (no animation)
      </label>

      <section data-lab-section="signature">
        <h2 className="g-section-title">Signature test · one flat colour, no glow, no particles</h2>
        <div className="g-lab-signature">
          {LAB_FORMS.map((form) => (
            <MykoRenderer key={form} model={visualFixture(form, "content")} traits={deriveMykoTraits(REFERENCE.identity)} still decorative />
          ))}
        </div>
      </section>

      <section data-lab-section="silhouettes">
        <h2 className="g-section-title">Silhouette test · solid shapes</h2>
        <div className="g-lab-silhouettes">
          {LAB_FORMS.map((form) => (
            <MykoRenderer key={form} model={visualFixture(form, "content")} traits={deriveMykoTraits(REFERENCE.identity)} still decorative />
          ))}
        </div>
      </section>

      <section data-lab-section="stages">
        <h2 className="g-section-title">4 forms · {REFERENCE.name}</h2>
        <div className="g-lab-row">
          {LAB_FORMS.map((form) => (
            <div key={form} className="g-lab-cell">
              <MykoStage model={visualFixture(form, "content")} identity={REFERENCE.identity} still={still} size="hero" label={form} />
              {FORM_NAMES[form]} · {form}
            </div>
          ))}
        </div>
      </section>

      <section data-lab-section="individuals">
        <h2 className="g-section-title">Individual variation · same form, same mood, different seed</h2>
        <div className="g-menu-chips" style={{ padding: 0, marginBottom: 12 }}>
          {LAB_FORMS.map((form) => (
            <button key={form} type="button" className="g-chip-link" aria-pressed={form === individualForm} onClick={() => setIndividualForm(form)}>{form}</button>
          ))}
        </div>
        <div className="g-lab-row g-lab-row-5">
          {LAB_INDIVIDUALS.map((individual) => {
            const traits = deriveMykoTraits(individual.identity)
            return (
              <div key={individual.identity} className="g-lab-cell">
                <MykoStage model={visualFixture(individualForm, "content")} identity={individual.identity} still={still} size="hero" label={individual.name} />
                <strong>{individual.name}</strong>
                <span className="g-lab-traits">lean {traits.lean} · curl {traits.curl} · turn {traits.capTurn}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section data-lab-section="moods">
        <h2 className="g-section-title">Same individual ({LAB_INDIVIDUALS[2].name}) · different mood</h2>
        <div className="g-lab-row">
          {LAB_MOODS.map((mood) => (
            <div key={mood} className="g-lab-cell">
              <MykoStage model={visualFixture("mature", mood)} identity={LAB_INDIVIDUALS[2].identity} still={still} size="hero" label={mood} />
              {mood}
            </div>
          ))}
        </div>
      </section>

      <section data-lab-section="activities">
        <h2 className="g-section-title">Activity · presentation only</h2>
        <button type="button" className="g-chip-link" data-lab="replay-activities" onClick={() => setReplay((n) => n + 1)} style={{ marginBottom: 12 }}>Replay activities</button>
        <div className="g-lab-row g-lab-row-5">
          {ACTIVITIES.map(({ activity, mood, note }) => (
            <div key={`${activity}-${replay}`} className="g-lab-cell">
              <MykoStage model={visualFixture("mature", mood)} identity={LAB_INDIVIDUALS[1].identity} activity={activity} senses={mood === "uncertain" ? QUIET_SENSES : LAB_ALL_SENSES.slice(0, 2)} still={still} size="hero" label={note} />
              {note}
            </div>
          ))}
        </div>
      </section>

      <section data-lab-section="senses">
        <h2 className="g-section-title">Senses on the body</h2>
        <div className="g-lab-row">
          <div className="g-lab-cell">
            <MykoStage model={visualFixture("mature", "content")} identity={REFERENCE.identity} senses={LAB_ALL_SENSES.slice(0, 2)} still={still} size="hero" label="installed senses" />
            installed today: temperature + humidity
          </div>
          <div className="g-lab-cell">
            <MykoStage model={visualFixture("mature", "content")} identity={REFERENCE.identity} senses={LAB_ALL_SENSES} still={still} size="hero" label="full sense system (fixture)" />
            FIXTURE: full system (vision · CO₂ · mass not installed)
          </div>
          <div className="g-lab-cell">
            <MykoStage model={visualFixture("early", "content")} identity={REFERENCE.identity} senses={LAB_ALL_SENSES} still={still} size="hero" label="full sense system early (fixture)" />
            FIXTURE: full system · early
          </div>
        </div>
      </section>

      <section data-lab-section="evolution">
        <h2 className="g-section-title">Evolution ceremony · lab only</h2>
        <p className="g-muted" style={{ marginTop: 0 }}>Not connected to cultivation data or stage suggestions. Future trigger: a persisted stage_confirmed event only.</p>
        <EvolutionPreview identity={REFERENCE.identity} />
      </section>

      <section>
        <h2 className="g-section-title">Glyphs</h2>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: "var(--grow-bone)" }}>
          {GLYPHS.map((icon) => (
            <span key={icon} className="g-lab-cell" style={{ width: 84 }}>
              <GrowIcon icon={icon} size={28} />
              {icon}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="g-section-title">Demo scenarios (simulation)</h2>
        <div className="g-menu-chips" style={{ padding: 0 }}>
          {GROW_DEMO_SCENARIOS.map((scenario) => (
            <Link key={scenario} className="g-chip-link" href={`/grow?mode=simulation&scenario=${scenario}`}>{scenario}</Link>
          ))}
        </div>
      </section>
    </div>
  )
}
