import { GROW_COPY, type PresentedNeed } from "@/lib/grow/presentation"
import { GrowIcon } from "../glyphs/grow-glyphs"

/** A need as its own visual piece: icon in its domain colour, short copy. Not an alarm box. */
export function NeedCard({ need, showHint = false }: { need: PresentedNeed; showHint?: boolean }) {
  return (
    <li style={{ listStyle: "none" }}>
      <div className="g-need" data-tone={need.tone}>
        <span className="g-need-icon" data-domain={need.domain}>
          <GrowIcon icon={need.icon} size={22} />
        </span>
        <span className="g-need-title">
          {need.title}
          {need.urgent && <span className="g-urgent">{GROW_COPY.needs.urgent}</span>}
        </span>
        <span className="g-need-body">{need.body}</span>
        {need.detected && <span className="g-need-meta">{need.detected}</span>}
      </div>
      {showHint && need.hint && <p className="g-hint">{need.hint}</p>}
    </li>
  )
}

export function NeedList({ needs, showHint = false }: { needs: PresentedNeed[]; showHint?: boolean }) {
  if (needs.length === 0) return <p className="g-muted" style={{ margin: 0 }}>{GROW_COPY.needs.none}</p>
  return (
    <ul style={{ display: "grid", gap: 12, margin: 0, padding: 0 }}>
      {needs.map((need) => (
        <NeedCard key={need.key} need={need} showHint={showHint} />
      ))}
    </ul>
  )
}
