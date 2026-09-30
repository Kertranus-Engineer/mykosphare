import { GROW_COPY, type PresentedNeed } from "@/lib/grow/presentation"
import { ToneMark } from "./tone-mark"

export function NeedCard({ need }: { need: PresentedNeed }) {
  return (
    <li className="g-need" data-tone={need.tone}>
      <ToneMark tone={need.tone} />
      <span className="g-need-title">
        {need.title}
        {need.urgent && <span className="g-journey-flag" style={{ color: "var(--g-critical)" }}>{GROW_COPY.needs.urgent}</span>}
      </span>
      <span className="g-need-body">{need.body}</span>
      {need.hint && <span className="g-need-hint">{need.hint}</span>}
    </li>
  )
}

export function NeedList({ needs, title = GROW_COPY.needs.title }: { needs: PresentedNeed[]; title?: string }) {
  return (
    <section aria-label={title}>
      <h2 className="g-section-title">{title}</h2>
      {needs.length === 0 ? (
        <p className="g-muted" style={{ margin: 0 }}>{GROW_COPY.needs.none}</p>
      ) : (
        <ul className="g-list-plain">
          {needs.map((need) => (
            <NeedCard key={need.key} need={need} />
          ))}
        </ul>
      )}
    </section>
  )
}
