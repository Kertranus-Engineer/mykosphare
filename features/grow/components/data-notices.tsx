import { GROW_COPY } from "@/lib/grow/presentation"
import type { GrowSnapshot } from "@/lib/grow/types"

/** Makes partial data and demo URL fallbacks visible without alarming. */
export function DataNotices({ snapshot, notices }: { snapshot: GrowSnapshot; notices: string[] }) {
  const partial = snapshot.reading !== null && snapshot.state.dataStatus === "partial"
  if (!partial && notices.length === 0) return null
  return (
    <div className="g-stack">
      {partial && <p className="g-notice" style={{ margin: 0 }}>{GROW_COPY.dataNotice.partial}</p>}
      {notices.map((notice) => (
        <p key={notice} className="g-notice" data-kind="simulation" style={{ margin: 0 }}>{notice}</p>
      ))}
    </div>
  )
}
