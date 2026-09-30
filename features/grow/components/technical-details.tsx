import { ChevronRight } from "lucide-react"
import { GROW_COPY, presentFreshness, presentSource, type GrowMode } from "@/lib/grow/presentation"
import type { GrowSnapshot } from "@/lib/grow/types"

/** Technical facts live behind "Ver datos", never on the primary surface. */
export function TechnicalDetails({ snapshot, mode }: { snapshot: GrowSnapshot; mode: GrowMode }) {
  const t = GROW_COPY.cultivation.tech
  const reading = snapshot.reading
  const rows: Array<[string, string]> = [
    [t.readingAt, reading?.timestamp ?? t.none],
    [t.source, `${presentSource(mode, snapshot.state.origin).label}${reading ? ` · ${reading.source}` : ""}`],
    [t.device, reading?.deviceId ?? t.none],
    [t.freshness, presentFreshness(snapshot.state.freshness).label],
    [t.data, t.dataStatus[snapshot.state.dataStatus]],
    [t.run, snapshot.run.id],
    [t.profile, `${snapshot.profile.id} (${snapshot.profile.kind})`],
  ]
  return (
    <details className="g-details">
      <summary>
        <ChevronRight className="size-4" aria-hidden="true" />
        {GROW_COPY.cultivation.technical}
      </summary>
      <dl className="g-dl">
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: "contents" }}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
