"use client"

import { AlertTriangle, Eye, Wrench, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Incident, IncidentStatus } from "@/lib/incidents/types"

const STATUS_META: Record<IncidentStatus, { color: string; bg: string; border: string; icon: typeof AlertTriangle }> = {
  open: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: AlertTriangle },
  acknowledged: { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Eye },
  mitigating: { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Wrench },
  resolved: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle },
}

export function IncidentBadge({ incident, compact }: { incident: Incident; compact?: boolean }) {
  const meta = STATUS_META[incident.status]
  const Icon = meta.icon

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1 rounded-md border px-1.5 py-0.5", meta.bg, meta.border)}>
        <Icon className={cn("size-2.5", meta.color)} />
        <span className={cn("text-[9px] font-semibold", meta.color)}>{incident.severity}</span>
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border p-2.5", meta.bg, meta.border)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("size-4 mt-0.5 shrink-0", meta.color)} />
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-foreground truncate">{incident.title}</span>
            <span className={cn("rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider", meta.bg, meta.color)}>
              {incident.status}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/70 line-clamp-1">{incident.description}</span>
          <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground/50">
            <span className="capitalize">{incident.correlationType}</span>
            <span>·</span>
            <span>{incident.alertIds.length} alert{incident.alertIds.length !== 1 ? "s" : ""}</span>
            {incident.affectedNodeIds.length > 0 && (
              <>
                <span>·</span>
                <span>{incident.affectedNodeIds.length} node{incident.affectedNodeIds.length !== 1 ? "s" : ""}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function IncidentScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 55 ? "bg-amber-500" : score >= 35 ? "bg-orange-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground/60 w-6 text-right">{score}</span>
    </div>
  )
}

export function IncidentSummaryBadge({
  openCount,
  criticalCount,
  totalCount,
}: {
  openCount: number
  criticalCount: number
  totalCount: number
}) {
  if (totalCount === 0) return null
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1">
      <AlertTriangle className="size-3 text-red-500" />
      <span className="text-[10px] font-medium text-red-500">{openCount} open</span>
      {criticalCount > 0 && (
        <>
          <span className="text-[10px] text-red-500/50">·</span>
          <span className="text-[10px] font-medium text-red-500">{criticalCount} critical</span>
        </>
      )}
      <span className="text-[10px] text-muted-foreground/50">· {totalCount} total</span>
    </div>
  )
}
