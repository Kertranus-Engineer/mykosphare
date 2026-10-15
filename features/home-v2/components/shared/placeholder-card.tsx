import { Sparkles } from "lucide-react"
import type { ReactNode } from "react"

import { Card, Chip } from "../ui/surface"

/**
 * Honest placeholder for a future intelligent feature. It never renders a
 * result: only what the feature will be and that it is not available yet.
 */
export function PlaceholderCard({
  title,
  badge,
  emptyLabel,
  body,
  icon,
  headingId,
}: {
  title: string
  badge: string
  emptyLabel: string
  body: string
  icon?: ReactNode
  headingId: string
}) {
  return (
    <Card as="section" className="hv2-placeholder" aria-labelledby={headingId}>
      <div className="hv2-placeholder-head">
        <span className="hv2-placeholder-icon" aria-hidden>{icon ?? <Sparkles className="size-5" />}</span>
        <h2 id={headingId} className="hv2-placeholder-title">{title}</h2>
        <Chip tone="info" className="hv2-chip--caps">{badge}</Chip>
      </div>
      <p className="hv2-placeholder-empty">{emptyLabel}</p>
      <p className="hv2-placeholder-body">{body}</p>
    </Card>
  )
}
