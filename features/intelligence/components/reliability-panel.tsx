"use client"

import { Cpu, Wifi, BatteryMedium, Gauge } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DeviceReliabilityScore } from "@/lib/intelligence/types"

const STATUS_GLOW: Record<string, string> = {
  optimal: "shadow-[0_0_8px_1px] shadow-emerald-500/20",
  stable: "shadow-[0_0_8px_1px] shadow-blue-500/20",
  degraded: "shadow-[0_0_8px_1px] shadow-amber-500/20",
  unstable: "shadow-[0_0_8px_1px] shadow-orange-500/20",
  critical: "shadow-[0_0_8px_1px] shadow-red-500/20",
}

export function ReliabilityPanel({ reliability }: { reliability: DeviceReliabilityScore }) {
  const glow = STATUS_GLOW[reliability.status] ?? ""
  const onlinePct = reliability.totalDevices > 0 ? Math.round((reliability.onlineDevices / reliability.totalDevices) * 100) : 0

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cpu className="size-4 text-violet-500" />
          Device Reliability
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-14 items-center justify-center rounded-xl bg-muted/30 ring-1 ring-border/40", glow)}>
            <span className="text-xl font-bold tabular-nums text-foreground">{reliability.score}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground capitalize">{reliability.status}</span>
            <span className="text-[10px] text-muted-foreground/50">
              {reliability.onlineDevices}/{reliability.totalDevices} devices online
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 p-2.5">
            <Wifi className="size-3.5 text-emerald-500/70 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground/60">Online</span>
              <span className="text-xs font-medium tabular-nums text-foreground">{onlinePct}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 p-2.5">
            <BatteryMedium className="size-3.5 text-blue-500/70 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground/60">Health</span>
              <span className="text-xs font-medium tabular-nums text-foreground">{reliability.avgHealth}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 p-2.5">
            <Gauge className="size-3.5 text-cyan-500/70 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground/60">Heartbeat</span>
              <span className="text-xs font-medium tabular-nums text-foreground">{reliability.heartbeatCompliance}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 p-2.5">
            <Cpu className="size-3.5 text-violet-500/70 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground/60">Uptime</span>
              <span className="text-xs font-medium tabular-nums text-foreground">{reliability.avgUptime}s</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
