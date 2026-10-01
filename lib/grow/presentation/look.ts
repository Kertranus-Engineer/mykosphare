import type { DataOrigin } from "../types"
import { GROW_COPY } from "./copy.es"

/**
 * Minimal visual-capture summary ("VER"). No capture source is wired yet, so
 * callers pass null; a future camera integration supplies real captures.
 */
export interface GrowCaptureSummary {
  id: string
  at: string
  imageUrl: string
  origin: DataOrigin
}

export type PresentedLook =
  | { kind: "empty"; title: string; body: string }
  | { kind: "capture"; title: string; imageUrl: string; at: string; simulatedLabel: string | null }

/** Never shows an image that does not exist; simulated captures must be labelled. */
export function presentLastLook(capture: GrowCaptureSummary | null): PresentedLook {
  if (!capture || !capture.imageUrl) return { kind: "empty", title: GROW_COPY.look.title, body: GROW_COPY.look.empty }
  return {
    kind: "capture",
    title: GROW_COPY.look.title,
    imageUrl: capture.imageUrl,
    at: capture.at,
    simulatedLabel: capture.origin === "simulated" ? GROW_COPY.look.simulated : null,
  }
}
