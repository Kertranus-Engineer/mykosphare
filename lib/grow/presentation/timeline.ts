import type { GrowTimelineEvent } from "../timeline"
import { GROW_COPY } from "./copy.es"
import type { GrowDomain, GrowIconKey } from "./icons"
import { stageLabel } from "./stage"
import type { GrowTone } from "./status"

export interface PresentedTimelineEvent {
  id: string
  at: string
  title: string
  tone: GrowTone
  icon: GrowIconKey
  domain: GrowDomain
  simulated: boolean
}

const METRIC_FALLBACK = "humidity" as const

const metricIcon = (metric: "temperature" | "humidity"): GrowIconKey => (metric === "temperature" ? "temperature" : "humidity")
const metricDomain = (metric: "temperature" | "humidity"): GrowDomain => (metric === "temperature" ? "heat" : "water")

export function presentTimelineEvent(event: GrowTimelineEvent): PresentedTimelineEvent {
  const events = GROW_COPY.timeline.events
  const metric = event.metric ?? METRIC_FALLBACK
  const base = { id: event.id, at: event.at, simulated: event.origin === "simulated" }
  switch (event.kind) {
    case "cultivation_started":
      return { ...base, title: events.cultivation_started, tone: "calm", icon: "growth", domain: "growth" }
    case "stage_confirmed":
      return { ...base, title: event.stage ? events.stage_confirmed(stageLabel(event.stage)) : events.stage_confirmed("—"), tone: "calm", icon: "event", domain: "myko" }
    case "capture_added":
      return { ...base, title: events.capture_added, tone: "calm", icon: "observe", domain: "myko" }
    case "condition_stable":
      return { ...base, title: events.condition_stable, tone: "calm", icon: "mycelium", domain: "bio" }
    case "metric_dropped":
      return { ...base, title: events.metric_dropped[metric], tone: "attention", icon: metricIcon(metric), domain: metricDomain(metric) }
    case "metric_rose":
      return { ...base, title: events.metric_rose[metric], tone: "attention", icon: metricIcon(metric), domain: metricDomain(metric) }
    case "metric_recovered":
      return { ...base, title: events.metric_recovered[metric], tone: "calm", icon: "check", domain: "bio" }
    case "metric_missing":
      return { ...base, title: events.metric_missing[metric], tone: "unknown", icon: "sense", domain: "neutral" }
    case "reading_received":
      return { ...base, title: events.reading_received, tone: "unknown", icon: "sense", domain: "neutral" }
    case "signal_lost":
      return { ...base, title: events.signal_lost, tone: "unknown", icon: "signal-off", domain: "neutral" }
  }
}

/** Newest first, without mutating the input. */
export function presentTimeline(events: readonly GrowTimelineEvent[]): PresentedTimelineEvent[] {
  return [...events]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map(presentTimelineEvent)
}

/** Events on the same local calendar day as `now` (viewer timezone). */
export function eventsOfDay<T extends { at: string }>(events: readonly T[], now: string | Date): T[] {
  const ref = new Date(now)
  return events.filter((event) => {
    const at = new Date(event.at)
    return at.getFullYear() === ref.getFullYear() && at.getMonth() === ref.getMonth() && at.getDate() === ref.getDate() && at.getTime() <= ref.getTime()
  })
}
