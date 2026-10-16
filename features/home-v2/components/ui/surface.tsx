import { FlaskConical, Radio, SignalZero } from "lucide-react"
import type { CSSProperties, ElementType, ReactNode } from "react"

import { cn } from "@/lib/utils"
import { COPY } from "../../copy"
import type { Provenance, Tone } from "../../data/model"

/** Staggered entrance. Pure CSS: order is set with --i, motion is disabled by prefers-reduced-motion. */
export function Rise({
  i = 0,
  as: Tag = "div",
  className,
  children,
}: {
  i?: number
  as?: ElementType
  className?: string
  children: ReactNode
}) {
  return (
    <Tag className={cn("hv2-rise", className)} style={{ "--i": i } as CSSProperties}>
      {children}
    </Tag>
  )
}

export function Card({
  as: Tag = "div",
  className,
  tone,
  children,
  ...rest
}: {
  as?: ElementType
  className?: string
  tone?: Tone
  children: ReactNode
} & Record<string, unknown>) {
  return (
    <Tag className={cn("hv2-card", className)} data-tone={tone} {...rest}>
      {children}
    </Tag>
  )
}

export function SectionHeading({
  title,
  action,
  id,
}: {
  title: string
  action?: ReactNode
  id?: string
}) {
  return (
    <div className="hv2-section-head">
      <h2 id={id} className="hv2-section-title">{title}</h2>
      {action}
    </div>
  )
}

export function Chip({
  tone = "muted",
  icon,
  children,
  className,
}: {
  tone?: Tone
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn("hv2-chip", className)} data-tone={tone}>
      {icon}
      {children}
    </span>
  )
}

export function ToneDot({ tone, pulse = false }: { tone: Tone; pulse?: boolean }) {
  return <span aria-hidden className="hv2-dot" data-tone={tone} data-pulse={pulse || undefined} />
}

const PROVENANCE_TONE: Record<Provenance, Tone> = { real: "ok", simulated: "sim", unavailable: "muted" }
const PROVENANCE_ICON = { real: Radio, simulated: FlaskConical, unavailable: SignalZero } as const

/** Real vs. simulated vs. unavailable. Shown wherever a value or a crop is presented. */
export function ProvenanceBadge({ provenance, className, quietSimulated = false }: { provenance: Provenance; className?: string; quietSimulated?: boolean }) {
  // `quietSimulated`: the persistent "vista de ejemplo" banner already says it; don't repeat it on every section.
  if (quietSimulated && provenance === "simulated") return null
  const Icon = PROVENANCE_ICON[provenance]
  return (
    <Chip tone={PROVENANCE_TONE[provenance]} className={cn("hv2-chip--caps", className)} icon={<Icon aria-hidden className="size-3" />}>
      {COPY.provenance[provenance]}
    </Chip>
  )
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={cn("hv2-skeleton", className)} style={style} />
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon: ReactNode
  title: string
  body?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className="hv2-empty" data-compact={compact || undefined}>
      <span aria-hidden className="hv2-empty-icon">{icon}</span>
      <p className="hv2-empty-title">{title}</p>
      {body && <p className="hv2-empty-body">{body}</p>}
      {action}
    </div>
  )
}
