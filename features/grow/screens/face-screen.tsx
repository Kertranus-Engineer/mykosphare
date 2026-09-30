"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  cultivationDay,
  GROW_COPY,
  presentNeeds,
  presentSenses,
  presentSource,
  presentStatus,
  stageLabel,
} from "@/lib/grow/presentation"
import { FreshnessLine } from "../components/freshness-line"
import { GrowViewState } from "../components/grow-view-state"
import { NeedCard } from "../components/need-list"
import { SourceBadge } from "../components/source-badge"
import { useGrow } from "../data/grow-provider"
import { MykoRenderer } from "../myko/myko-renderer"

/** How long the interaction layer stays before returning to ambient. */
const INTERACTION_MS = 12_000

type FaceMode = "ambient" | "interaction"

function useFullscreen() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const sync = () => setActive(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", sync)
    return () => document.removeEventListener("fullscreenchange", sync)
  }, [])
  const supported = typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function"
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }, [])
  return { active, supported, toggle }
}

/**
 * Ambient face for the phone mounted on the chamber. Two states only:
 * ambient (MYKO + minimum facts) and interaction (tap MYKO → details for a
 * few seconds). No AI and no per-frame JS; motion is CSS in grow.css.
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

  const toInteraction = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setMode("interaction")
    timer.current = setTimeout(() => setMode("ambient"), INTERACTION_MS)
  }, [])

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
  const day = cultivationDay(snapshot.run.startedAt, evaluatedAt)
  const [temperature, humidity] = presentSenses(snapshot)
  const needs = presentNeeds(snapshot.state)

  return (
    <div className="g-face" data-face-mode={mode}>
      <div className="g-face-top">
        <span className="g-wordmark">{GROW_COPY.brand}</span>
        <SourceBadge source={source} />
      </div>

      <button
        type="button"
        className="g-face-myko-button"
        onClick={mode === "ambient" ? toInteraction : toAmbient}
        aria-expanded={mode === "interaction"}
        aria-label={`${status.title}. ${GROW_COPY.myko.tapHint}`}
      >
        <span className="g-face-myko">
          <MykoRenderer model={snapshot.myko} decorative />
        </span>
      </button>

      <div className="g-face-info" aria-live="polite">
        <p className="g-face-status" data-tone={status.tone}>{status.title}</p>
        <p className="g-face-line" style={{ margin: 0 }}>
          {stageLabel(snapshot.state.confirmedStage)}
          {day !== null && ` · ${GROW_COPY.stage.day(day)}`}
        </p>
        <p className="g-face-line" style={{ margin: 0 }}>
          <span aria-label={`${temperature.label} ${temperature.value}`}>{temperature.value}</span>
          <span aria-hidden="true">{"  ·  "}</span>
          <span aria-label={`${humidity.label} ${humidity.value}`}>{humidity.value}</span>
          {(temperature.lastKnown || humidity.lastKnown) && <span className="g-muted">{`  ·  ${GROW_COPY.metrics.lastKnown}`}</span>}
        </p>
      </div>

      {mode === "interaction" && (
        <div className="g-face-overlay" role="dialog" aria-label={status.title}>
          <div>
            <p className="g-status-title" data-tone={status.tone} style={{ fontSize: "1.6rem" }}>{status.title}</p>
            <p className="g-status-body" style={{ marginTop: 6 }}>{status.body}</p>
          </div>
          <FreshnessLine freshness={snapshot.state.freshness} lastReading={status.lastReading} />
          {needs.length > 0 && (
            <ul className="g-list-plain">
              {needs.map((need) => <NeedCard key={need.key} need={need} />)}
            </ul>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="g-button" onClick={toAmbient}>{GROW_COPY.face.back}</button>
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
