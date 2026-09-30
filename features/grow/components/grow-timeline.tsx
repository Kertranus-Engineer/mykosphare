import { GROW_COPY, presentTimeline } from "@/lib/grow/presentation"
import type { GrowTimelineEvent } from "@/lib/grow/timeline"
import { LocalTime } from "./local-time"
import { ToneMark } from "./tone-mark"

/**
 * Pure renderer for structured events. It does not fetch, generate or infer
 * events; the caller supplies them (demo fixtures or, later, persisted events).
 */
export function GrowTimeline({
  events,
  now,
  limit,
  title = GROW_COPY.timeline.title,
}: {
  events: readonly GrowTimelineEvent[]
  now: string
  limit?: number
  title?: string
}) {
  const items = presentTimeline(events).slice(0, limit)
  return (
    <section aria-label={title}>
      <h2 className="g-section-title">{title}</h2>
      {items.length === 0 ? (
        <p className="g-muted" style={{ margin: 0 }}>{GROW_COPY.timeline.empty}</p>
      ) : (
        <ol className="g-timeline">
          {items.map((item) => (
            <li key={item.id} className="g-timeline-item">
              <span className="g-timeline-time"><LocalTime iso={item.at} now={now} /></span>
              <ToneMark tone={item.tone} />
              <span className="g-timeline-title">
                {item.title}
                {item.simulated && <span className="g-timeline-sim">{GROW_COPY.timeline.simulatedTag}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
