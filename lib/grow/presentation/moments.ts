import type { GrowTimelineEvent } from "../timeline"
import { GROW_COPY } from "./copy.es"
import type { GrowDomain, GrowIconKey } from "./icons"

/**
 * MOMENTS — significant, REAL cultivation events that deserve a presentation
 * (and, for stage_confirmed, a future evolution ceremony). The UI knows how to
 * present them; it never invents them. No XP, levels, coins, streaks or
 * rewards: progress comes only from the cultivation itself.
 *
 * `harvest_confirmed` has no source event yet, so it is never produced; the
 * vocabulary is reserved so the presentation is ready when the event exists.
 */
export type GrowMomentKind =
  | "cultivation_started"
  | "stage_confirmed"
  | "first_capture"
  | "environment_recovered"
  | "harvest_confirmed"

export interface PresentedMoment {
  kind: GrowMomentKind
  title: string
  /** MYKO's first-person line for the moment. */
  voice: string
  icon: GrowIconKey
  domain: GrowDomain
}

const IDENTITY: Record<GrowMomentKind, { icon: GrowIconKey; domain: GrowDomain }> = {
  cultivation_started: { icon: "growth", domain: "growth" },
  stage_confirmed: { icon: "event", domain: "myko" },
  first_capture: { icon: "observe", domain: "myko" },
  environment_recovered: { icon: "check", domain: "bio" },
  harvest_confirmed: { icon: "memory", domain: "growth" },
}

export function presentMoment(kind: GrowMomentKind): PresentedMoment {
  return { kind, ...GROW_COPY.moments[kind], ...IDENTITY[kind] }
}

/**
 * Moments that a list of recorded events actually proves. Only the FIRST
 * capture is a moment; a recovery is a moment only when a recorded
 * `metric_recovered` event exists. Unknown kinds produce nothing.
 */
export function momentsFromEvents(events: readonly GrowTimelineEvent[]): Array<{ event: GrowTimelineEvent; moment: PresentedMoment }> {
  const ordered = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  let captureSeen = false
  const result: Array<{ event: GrowTimelineEvent; moment: PresentedMoment }> = []
  for (const event of ordered) {
    let kind: GrowMomentKind | null = null
    if (event.kind === "cultivation_started") kind = "cultivation_started"
    else if (event.kind === "stage_confirmed") kind = "stage_confirmed"
    else if (event.kind === "metric_recovered") kind = "environment_recovered"
    else if (event.kind === "capture_added" && !captureSeen) {
      captureSeen = true
      kind = "first_capture"
    }
    if (kind) result.push({ event, moment: presentMoment(kind) })
  }
  return result
}
