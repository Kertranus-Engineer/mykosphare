"use client"

import { memo } from "react"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDelta } from "@/features/visual-intelligence/utils"

export const DeltaBadge = memo(function DeltaBadge({ value, unit, decimals = 1 }: { value: number; unit: string; decimals?: number }) {
  const isUp = value > 0.05
  const isDown = value < -0.05
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus
  const color = isUp ? "text-amber-500" : isDown ? "text-cyan-500" : "text-muted-foreground/50"
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", color)}>
      <Icon className="size-3" />
      {formatDelta(value, unit, decimals)}
    </span>
  )
})
