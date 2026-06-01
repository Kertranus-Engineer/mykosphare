"use client"

import { memo } from "react"
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface TrendStatisticsProps {
  improving: number
  stable: number
  degrading: number
  total: number
}

export const TrendStatistics = memo(function TrendStatistics({
  improving,
  stable,
  degrading,
  total,
}: TrendStatisticsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-sky-500/10 shadow-[0_0_12px_-4px] shadow-sky-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <Activity className="size-3.5 text-sky-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-sky-500">{total}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Total Trends</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-emerald-500/10 shadow-[0_0_12px_-4px] shadow-emerald-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <TrendingUp className="size-3.5 text-emerald-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-emerald-500">{improving}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Improving</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-sky-500/10 shadow-[0_0_12px_-4px] shadow-sky-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <Minus className="size-3.5 text-sky-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-sky-500">{stable}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Stable</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-amber-500/10 shadow-[0_0_12px_-4px] shadow-amber-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <TrendingDown className="size-3.5 text-amber-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-amber-500">{degrading}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Degrading</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
