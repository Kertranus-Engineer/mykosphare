"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  cultivationDay,
  GROW_COPY,
  presentFreshness,
  presentNeedCue,
  presentSenses,
  presentSource,
  presentSpecies,
  presentStatus,
  stageLabel,
} from "@/lib/grow/presentation"
import { GrowViewState } from "../components/grow-view-state"
import { SourceBadge } from "../components/source-badge"
import { useGrow } from "../data/grow-provider"
import { GrowIcon } from "../glyphs/grow-glyphs"
import { mykoPresence } from "../myko/presence"
import { MykoStage } from "../myko/myko-stage"

/** How long the detail panel stays before returning to ambient. */
const INTERACTION_MS = 12_000

type FaceMode = "ambient" | "interaction"

function useFullscreen() {
  const [state, setState] = useState({ active: false, supported: false })
  useEffect(() => {
    const sync = () => setState({ active: Boolean(document.fullscreenElement), supported: typeof document.documentElement.requestFullscreen === "function" })
    sync()
    document.addEventListener("fullscreenchange", sync)
    return () => document.removeEventListener("fullscreenchange", sync)
  }, [])
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }, [])
  return { ...state, toggle }
}

/**
 * The physical face of the device. Ambient: MYKO fills the screen with the
 * minimum of facts. Tap: MYKO reacts and a light panel shows details; a second
 * tap (or Cerrar) returns to ambient. No AI, no per-frame JS.
 */
export function FaceScreen() {
  const { view, retry } = useGrow()
  const [mode, setMode] = useState<FaceMode>("ambient")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fullscreen = useFullscreen()

  const toAmbient = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setMode("ambient")
  }, [])

  const toggle = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    if (mode === "interaction") {
      setMode("ambient")
      return
    }
    setMode("interaction")
    timer.current = setTimeout(() => setMode("ambient"), INTERACTION_MS)
  }, [mode])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  if (view.status !== "ready") {
    return (
      <div className="g-face" style={{ overflowY: "auto" }}>
        <GrowViewState view={view} onRetry={retry} />
      </div>
    )
  }

  const { snapshot, evaluatedAt } = view
  const status = presentStatus(snapshot, evaluatedAt)
  const source = presentSource(view.mode, snapshot.state.origin)
  const species = presentSpecies(snapshot.profile)
  const day = cultivationDay(snapshot.run.startedAt, evaluatedAt)
  const [temperature, humidity] = presentSenses(snapshot)
  const dim = temperature.lastKnown || humidity.lastKnown
  const stage = stageLabel(snapshot.state.confirmedStage)

  return (
    <div className="g-face" data-face-mode={mode}>
      {/* Only provenance at the top: SIMULACIÓN must be readable from across the room. */}
      <div className="g-face-top" data-source={source.kind}>
        <SourceBadge source={source} />
      </div>

      <div className="g-face-center">
        <MykoStage
          {...mykoPresence(snapshot)}
          cue={presentNeedCue(snapshot.state)}
          size="face"
          label={`${status.title}. ${GROW_COPY.myko.tapHint}`}
          onActivate={toggle}
          expanded={mode === "interaction"}
        />
      </div>

      <div className="g-face-info" aria-live="polite">
        <p className="g-face-need" data-tone={status.tone}>{status.title}</p>
        <p className="g-face-crop">{species.name} · {stage}</p>
        <p className="g-face-metrics" data-dim={dim}>
          <span data-domain={dim ? "neutral" : temperature.domain} aria-label={`${temperature.label} ${temperature.value}`}>
            <GrowIcon icon="temperature" size={22} /><span className="g-face-value">{temperature.value}</span>
          </span>
          <span data-domain={dim ? "neutral" : humidity.domain} aria-label={`${humidity.label} ${humidity.value}`}>
            <GrowIcon icon="humidity" size={22} /><span className="g-face-value">{humidity.value}</span>
          </span>
        </p>
        {dim && <p className="g-muted" style={{ margin: 0, fontSize: "0.85rem" }}>{status.lastReading ?? GROW_COPY.time.noReading}</p>}
      </div>

      {mode === "interaction" && (
        <div className="g-face-panel" role="dialog" aria-label={status.title}>
          <div>
            <p className="g-block-status" data-tone={status.tone}>{status.title}</p>
            <p className="g-muted" style={{ margin: "4px 0 0" }}>{status.body}</p>
          </div>
          <dl className="g-face-panel-grid">
            <div><dt>{temperature.label}</dt><dd>{temperature.value} · {temperature.conditionLabel}</dd></div>
            <div><dt>{humidity.label}</dt><dd>{humidity.value} · {humidity.conditionLabel}</dd></div>
            <div><dt>{GROW_COPY.stage.current}</dt><dd>{stage}{day !== null && ` · ${GROW_COPY.stage.day(day)}`}</dd></div>
            <div><dt>{presentFreshness(snapshot.state.freshness).label}</dt><dd>{status.lastReading ?? GROW_COPY.time.noReading}</dd></div>
          </dl>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="g-button" onClick={toAmbient}>{GROW_COPY.face.close}</button>
            {fullscreen.supported && (
              <button type="button" className="g-button g-button-ghost" onClick={fullscreen.toggle}>
                {fullscreen.active ? GROW_COPY.face.exitFullscreen : GROW_COPY.face.fullscreen}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
