import type { GrowTimelineEvent } from "../timeline"
import type { GrowSnapshot } from "../types"
import { GROW_COPY } from "./copy.es"
import { cultivationDay } from "./stage"

export interface PresentedHistoryStat {
  key: "days" | "events" | "captures"
  label: string
  value: string
}

export interface PresentedHistory {
  stats: PresentedHistoryStat[]
  /** True if any counted event is simulated (must be labelled). */
  includesSimulated: boolean
}

/**
 * Honest history numbers only: each stat appears only when its source data
 * exists. No invented counters, no scores.
 */
export function presentHistory(
  snapshot: GrowSnapshot,
  events: readonly GrowTimelineEvent[],
  now: string | Date,
  captureCount: number | null = null,
): PresentedHistory {
  const stats: PresentedHistoryStat[] = []
  const day = cultivationDay(snapshot.run.startedAt, now)
  if (day !== null) stats.push({ key: "days", label: GROW_COPY.history.days, value: String(day) })
  if (events.length > 0) stats.push({ key: "events", label: GROW_COPY.history.events, value: String(events.length) })
  if (captureCount !== null && captureCount > 0) stats.push({ key: "captures", label: GROW_COPY.history.captures, value: String(captureCount) })
  return { stats, includesSimulated: events.some((event) => event.origin === "simulated") }
}
