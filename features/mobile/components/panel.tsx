import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card/80 shadow-[0_0_24px_-14px] shadow-emerald-500/25", className)}>
      {children}
    </div>
  )
}

export function InfoRow({
  label,
  value,
  valueClassName,
  hint,
}: {
  label: string
  value: ReactNode
  valueClassName?: string
  hint?: string
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm text-foreground/90">{label}</p>
        {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
      </div>
      <div className={cn("shrink-0 text-right text-sm font-medium tabular-nums", valueClassName)}>{value}</div>
    </div>
  )
}
