import type { GrowTimelineEvent } from "../timeline"
import { GROW_COPY } from "./copy.es"
import type { GrowTone } from "./status"

export interface PresentedTimelineEvent {
  id: string
  at: string
  title: string
  tone: GrowTone
  simulated: boolean
}

const METRIC_FALLBACK = "humidity" as const

export function presentTimelineEvent(event: GrowTimelineEvent): PresentedTimelineEvent {
  const events = GROW_COPY.timeline.events
  const metric = event.metric ?? METRIC_FALLBACK
  let title: string
  let tone: GrowTone
  switch (event.kind) {
    case "condition_stable": title = events.condition_stable; tone = "calm"; break
    case "metric_dropped": title = events.metric_dropped[metric]; tone = "attention"; break
    case "metric_rose": title = events.metric_rose[metric]; tone = "attention"; break
    case "metric_recovered": title = events.metric_recovered[metric]; tone = "calm"; break
    case "metric_missing": title = events.metric_missing[metric]; tone = "unknown"; break
    case "reading_received": title = events.reading_received; tone = "unknown"; break
    case "signal_lost": title = events.signal_lost; tone = "unknown"; break
  }
  return { id: event.id, at: event.at, title, tone, simulated: event.origin === "simulated" }
}

/** Newest first, without mutating the input. */
export function presentTimeline(events: readonly GrowTimelineEvent[]): PresentedTimelineEvent[] {
  return [...events]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map(presentTimelineEvent)
}
