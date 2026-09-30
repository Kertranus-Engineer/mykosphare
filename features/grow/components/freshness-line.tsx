import { presentFreshness, GROW_COPY } from "@/lib/grow/presentation"
import type { DeviceFreshness } from "@/lib/grow/types"

/** Connection health (freshness), independent from provenance. */
export function FreshnessLine({ freshness, lastReading }: { freshness: DeviceFreshness; lastReading: string | null }) {
  const presented = presentFreshness(freshness)
  return (
    <p className="g-freshness" data-freshness={freshness} style={{ margin: 0 }}>
      <span className="g-freshness-chip">{presented.label}</span>
      <span>{lastReading ?? GROW_COPY.time.noReading}</span>
    </p>
  )
}
