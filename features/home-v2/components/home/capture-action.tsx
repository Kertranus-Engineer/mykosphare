"use client"

import { Camera } from "lucide-react"

import { COPY } from "../../copy"
import { useFeedback } from "../feedback"

/**
 * Visual-only primary action. There is no real, reusable photo-registration
 * function yet (the existing upload widget only keeps files in memory), so the
 * button says so instead of faking an upload.
 */
export function CaptureAction() {
  const { notify } = useFeedback()
  return (
    <div className="hv2-capture">
      <button
        type="button"
        className="hv2-button hv2-button--primary hv2-button--block hv2-press"
        aria-describedby="hv2-capture-hint"
        onClick={() => notify({ title: COPY.capture.unavailableTitle, message: COPY.capture.unavailable })}
      >
        <Camera aria-hidden className="size-5" />
        {COPY.capture.action}
      </button>
      <p id="hv2-capture-hint" className="hv2-caption hv2-capture-hint">{COPY.capture.hint}</p>
    </div>
  )
}
