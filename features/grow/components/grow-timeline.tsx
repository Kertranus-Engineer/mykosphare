import { GROW_COPY, presentTimeline } from "@/lib/grow/presentation"
import type { GrowTimelineEvent } from "@/lib/grow/timeline"
import { GrowIcon } from "../glyphs/grow-glyphs"
import { LocalTime } from "./local-time"

/**
 * Pure renderer for structured events. It does not fetch, generate or infer
 * events; the caller supplies them (run milestones, demo fixtures, later a
 * persisted event feed).
 */
export function GrowTimeline({
  events,
  now,
  limit,
  emptyText = GROW_COPY.timeline.empty,
}: {
  events: readonly GrowTimelineEvent[]
  now: string
  limit?: number
  emptyText?: string
}) {
  const items = presentTimeline(events).slice(0, limit)
  if (items.length === 0) return <p className="g-muted" style={{ margin: 0 }}>{emptyText}</p>
  return (
    <ol className="g-timeline">
      {items.map((item) => (
        <li key={item.id} className="g-timeline-item">
          <span className="g-timeline-icon" data-domain={item.tone === "attention" ? "attention" : item.domain}>
            <GrowIcon icon={item.icon} size={18} />
          </span>
          <span className="g-timeline-title">{item.title}</span>
          <span className="g-timeline-time">
            <LocalTime iso={item.at} now={now} />
            {item.simulated && <span className="g-timeline-sim" title={GROW_COPY.timeline.simulatedLabel}>{GROW_COPY.timeline.simulatedTag}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
