"use client"

import Link from "next/link"
import { GROW_COPY } from "@/lib/grow/presentation"
import type { GrowView } from "../data/grow-view"

type NonReadyView = Exclude<GrowView, { status: "ready" }>

const COPY: Record<Exclude<NonReadyView["status"], "loading">, { title: string; body: string }> = {
  unconfigured: GROW_COPY.views.unconfigured,
  invalid: GROW_COPY.views.invalid,
  unauthorized: GROW_COPY.views.unauthorized,
  not_found: GROW_COPY.views.notFound,
  no_active_run: GROW_COPY.views.noRun,
  profile_missing: GROW_COPY.views.profileMissing,
  unavailable: GROW_COPY.views.unavailable,
  network_error: GROW_COPY.views.network,
}

/**
 * Every non-ready state is explicit and distinct. MYKO is not shown: without a
 * snapshot there is nothing truthful for it to represent.
 */
export function GrowViewState({ view, onRetry }: { view: NonReadyView; onRetry: () => void }) {
  if (view.status === "loading") {
    return (
      <div className="g-state" role="status">
        <div className="g-loading-line" />
        <p>{GROW_COPY.views.loading}</p>
      </div>
    )
  }

  const copy = COPY[view.status]
  const retryable = view.status === "unavailable" || view.status === "network_error"

  return (
    <div className="g-state" role={retryable ? "alert" : undefined}>
      <div className="g-state-mark" aria-hidden="true" />
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      {retryable && (
        <button type="button" className="g-button g-button-ghost" onClick={onRetry}>{GROW_COPY.views.retry}</button>
      )}
      {view.status === "unauthorized" && (
        <a className="g-button" href="/auth/login">{GROW_COPY.views.unauthorized.action}</a>
      )}
      {view.status === "no_active_run" && (
        <span className="g-button" aria-disabled="true">{GROW_COPY.views.noRun.action}</span>
      )}
      {view.status === "unconfigured" && (
        <Link className="g-button g-button-ghost" href="/grow?mode=simulation">{GROW_COPY.views.unconfigured.demo}</Link>
      )}
    </div>
  )
}
