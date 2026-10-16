"use client"

import { Camera } from "lucide-react"

import { COPY } from "../../copy"
import { useFeedback } from "../feedback"
import { Card, Chip } from "../ui/surface"

/**
 * Primary action of Inicio. Registering a photograph is NOT implemented, so this is an honest
 * "not available yet" state: it never opens a picker, never pretends to upload, and tapping it
 * only explains why.
 */
export function CaptureCard() {
  const { notify } = useFeedback()
  return (
    <Card as="section" className="hv2-capture" aria-labelledby="hv2-capture-h">
      <button
        type="button"
        className="hv2-capture-button hv2-press"
        aria-disabled="true"
        aria-describedby="hv2-capture-d"
        onClick={() => notify({ message: COPY.capture.toast })}
      >
        <span className="hv2-capture-icon" aria-hidden><Camera className="size-6" /></span>
        <span className="hv2-capture-text">
          <span className="hv2-capture-line">
            <span id="hv2-capture-h" className="hv2-capture-title">{COPY.capture.title}</span>
            <Chip tone="info" className="hv2-chip--caps">{COPY.capture.badge}</Chip>
          </span>
          <span id="hv2-capture-d" className="hv2-capture-body">{COPY.capture.body}</span>
        </span>
      </button>
    </Card>
  )
}
