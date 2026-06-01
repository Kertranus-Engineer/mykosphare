"use client"

import { memo } from "react"
import { Info, AlertTriangle, ShieldAlert, ScanEye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ObservationStatisticsProps {
  info: number
  warning: number
  critical: number
  total: number
}

export const ObservationStatistics = memo(function ObservationStatistics({
  info,
  warning,
  critical,
  total,
}: ObservationStatisticsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-sky-500/10 shadow-[0_0_12px_-4px] shadow-sky-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <ScanEye className="size-3.5 text-sky-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-sky-500">{total}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Total Observations</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-sky-500/10 shadow-[0_0_12px_-4px] shadow-sky-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <Info className="size-3.5 text-sky-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-sky-500">{info}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Info</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-amber-500/10 shadow-[0_0_12px_-4px] shadow-amber-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <AlertTriangle className="size-3.5 text-amber-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-amber-500">{warning}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Warning</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-red-500/10 shadow-[0_0_12px_-4px] shadow-red-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <ShieldAlert className="size-3.5 text-red-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-red-500">{critical}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Critical</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
