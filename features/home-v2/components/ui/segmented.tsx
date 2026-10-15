"use client"

import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
  id: T
  label: string
  icon?: ReactNode
}

/**
 * Tablist-style segmented control (roving tabindex, arrow keys, Home/End).
 * The thumb is a CSS translate between equal-width cells, so it needs no JS measuring.
 * Pair every tab with a `role="tabpanel"` carrying `id={panelId(id)}`.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  idPrefix: string
  className?: string
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const current = Math.max(0, options.findIndex((option) => option.id === value))

  const move = (event: KeyboardEvent, delta: number | "start" | "end") => {
    event.preventDefault()
    const next = delta === "start" ? 0 : delta === "end" ? options.length - 1 : (current + delta + options.length) % options.length
    const target = options[next]
    onChange(target.id)
    refs.current[target.id]?.focus()
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") move(event, 1)
    else if (event.key === "ArrowLeft") move(event, -1)
    else if (event.key === "Home") move(event, "start")
    else if (event.key === "End") move(event, "end")
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("hv2-segmented", className)}
      style={{ "--seg-count": options.length, "--seg-index": current } as CSSProperties}
      onKeyDown={onKeyDown}
    >
      <span aria-hidden className="hv2-segmented-thumb" />
      {options.map((option) => {
        const selected = option.id === value
        return (
          <button
            key={option.id}
            ref={(node) => { refs.current[option.id] = node }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${option.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${option.id}`}
            tabIndex={selected ? 0 : -1}
            className="hv2-segmented-tab hv2-press"
            onClick={() => onChange(option.id)}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export const tabPanelProps = (idPrefix: string, id: string) =>
  ({ role: "tabpanel", id: `${idPrefix}-panel-${id}`, "aria-labelledby": `${idPrefix}-tab-${id}`, tabIndex: 0 }) as const
