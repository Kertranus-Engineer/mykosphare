"use client"

import { Activity, Cpu, Gauge, Wifi, Zap, AlertTriangle, Shield } from "lucide-react"
import type { TopologyMetrics as TM } from "@/lib/topology/types"
import { cn } from "@/lib/utils"

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Activity
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-muted/20 p-2.5 transition-colors hover:bg-muted/30">
      <Icon className={cn("size-4 shrink-0", color ?? "text-muted-foreground/60")} />
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground/60">{label}</span>
        <span className="text-sm font-medium tabular-nums text-foreground">{value}</span>
        {sub && <span className="text-[9px] text-muted-foreground/40">{sub}</span>}
      </div>
    </div>
  )
}

export function TopologyMetrics({ metrics }: { metrics: TM }) {
  return (
    <div className="grid flex-1 grid-cols-4 gap-2 lg:grid-cols-8">
      <StatCard icon={Cpu} label="Total Nodes" value={`${metrics.totalNodes}`} color="text-violet-500/70" />
      <StatCard icon={Wifi} label="Active" value={`${metrics.activeNodes}`} sub={`${metrics.offlineNodes} offline`} color="text-emerald-500/70" />
      <StatCard icon={Gauge} label="Avg Latency" value={`${metrics.avgLatency}ms`} color="text-blue-500/70" />
      <StatCard icon={Zap} label="Packet Flow" value={`${metrics.totalPacketFlow}/s`} color="text-amber-500/70" />
      <StatCard icon={Activity} label="Uptime Quality" value={`${metrics.uptimeQuality}%`} color="text-emerald-500/70" />
      <StatCard icon={Cpu} label="Avg Health" value={`${metrics.avgHealth}%`} color="text-cyan-500/70" />
      <StatCard icon={AlertTriangle} label="Degraded" value={`${metrics.degradedNodes + metrics.warningNodes}`} sub={`${metrics.syncingNodes} syncing`} color="text-amber-500/70" />
      <StatCard icon={Shield} label="Standby" value={`${metrics.standbyNodes}`} color="text-muted-foreground/60" />
    </div>
  )
}
