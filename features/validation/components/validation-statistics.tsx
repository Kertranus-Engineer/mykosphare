"use client"

import { memo } from "react"
import { Check, X, Clock, ShieldCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ValidationStatisticsProps {
  confirmed: number
  rejected: number
  pending: number
  total: number
}

export const ValidationStatistics = memo(function ValidationStatistics({
  confirmed,
  rejected,
  pending,
  total,
}: ValidationStatisticsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-sky-500/10 shadow-[0_0_12px_-4px] shadow-sky-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <ShieldCheck className="size-3.5 text-sky-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-sky-500">{total}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Total</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-emerald-500/10 shadow-[0_0_12px_-4px] shadow-emerald-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <Check className="size-3.5 text-emerald-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-emerald-500">{confirmed}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Confirmed</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-red-500/10 shadow-[0_0_12px_-4px] shadow-red-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <X className="size-3.5 text-red-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-red-500">{rejected}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Rejected</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-amber-500/10 shadow-[0_0_12px_-4px] shadow-amber-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <Clock className="size-3.5 text-amber-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-amber-500">{pending}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Pending</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
