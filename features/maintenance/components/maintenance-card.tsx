"use client"

import { Wrench, Clock, CheckCircle, AlertTriangle, Gauge } from "lucide-react"
import { cn } from "@/lib/utils"
import { CARD_HOVER } from "@/lib/styles/tokens"
import { priorityToColor, priorityToBg, statusToColor, statusToBg } from "@/lib/maintenance/scoring"
import type { MaintenanceRecommendation } from "@/lib/maintenance/types"

const SOURCE_LABELS: Record<string, string> = {
  "recurring-incident": "Recurring Incident",
  "sensor-drift": "Sensor Drift",
  "heartbeat-instability": "Heartbeat Instability",
  "reliability-degradation": "Reliability Degradation",
  "alert-density": "Alert Density",
}

const EFFORT_LABELS: Record<string, string> = {
  quick: "Quick Fix",
  moderate: "Moderate",
  extended: "Extended",
}

export function MaintenanceCard({
  recommendation,
  onSchedule,
  onStart,
  onComplete,
}: {
  recommendation: MaintenanceRecommendation
  onSchedule: (id: string, scheduledAt: string) => void
  onStart: (id: string) => void
  onComplete: (id: string) => void
}) {
  const pColor = priorityToColor(recommendation.priority)
  const pBg = priorityToBg(recommendation.priority)
  const sColor = statusToColor(recommendation.status)
  const sBg = statusToBg(recommendation.status)

  return (
    <div className={cn("rounded-xl border border-border/50 bg-card p-3", CARD_HOVER)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className={cn("size-4 shrink-0", pColor)} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium text-foreground truncate">{recommendation.title}</span>
              <span className={cn("rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider", sBg, sColor)}>
                {recommendation.status.replace("_", " ")}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground/60 line-clamp-1">{recommendation.description}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-1">
          <div className={cn("size-2 rounded-full", pBg.replace("/10", "/30"))} />
          <span className={cn("text-[10px] font-medium capitalize", pColor)}>{recommendation.priority}</span>
        </div>
        <span className="text-[10px] text-muted-foreground/50">{SOURCE_LABELS[recommendation.source] ?? recommendation.source}</span>
        <span className="text-[10px] text-muted-foreground/50">{EFFORT_LABELS[recommendation.estimatedEffort]}</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", recommendation.score >= 75 ? "bg-emerald-500" : recommendation.score >= 55 ? "bg-amber-500" : "bg-red-500")}
            style={{ width: `${recommendation.score}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground/60">{recommendation.score}</span>
      </div>

      <p className="text-[10px] text-muted-foreground/70 mb-2 leading-relaxed">{recommendation.suggestedAction}</p>

      {recommendation.affectedNodeIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {recommendation.affectedNodeIds.map((nid) => (
            <span key={nid} className="rounded-md bg-muted/20 px-1.5 py-0.5 text-[9px] text-muted-foreground/60">
              {nid}
            </span>
          ))}
        </div>
      )}

      {recommendation.status !== "completed" && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-border/30">
          {recommendation.status === "pending" && (
            <button
              onClick={() => onSchedule(recommendation.id, new Date(Date.now() + 86_400_000).toISOString())}
              className="flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-1 text-[9px] font-medium text-blue-500 hover:bg-blue-500/20 transition-colors"
            >
              <Clock className="size-3" />
              Schedule
            </button>
          )}
          {recommendation.status === "scheduled" && (
            <button
              onClick={() => onStart(recommendation.id)}
              className="flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[9px] font-medium text-amber-500 hover:bg-amber-500/20 transition-colors"
            >
              <Wrench className="size-3" />
              Start Work
            </button>
          )}
          {recommendation.status === "in_progress" && (
            <button
              onClick={() => onComplete(recommendation.id)}
              className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[9px] font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle className="size-3" />
              Complete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function MaintenanceSummaryBadge({ pending, critical }: { pending: number; critical: number }) {
  if (pending === 0 && critical === 0) return null
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2 py-1">
      <Wrench className="size-3 text-orange-500" />
      <span className="text-[10px] font-medium text-orange-500">{pending} pending</span>
      {critical > 0 && (
        <>
          <span className="text-[10px] text-orange-500/50">·</span>
          <span className="text-[10px] font-medium text-red-500">{critical} critical</span>
        </>
      )}
    </div>
  )
}

export function MttrBadge({ hours }: { hours: number }) {
  const color = hours <= 1 ? "text-emerald-500" : hours <= 4 ? "text-amber-500" : "text-red-500"
  return (
    <div className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1">
      <Clock className={cn("size-3", color)} />
      <span className={cn("text-[10px] font-medium tabular-nums", color)}>MTTR {hours}h</span>
    </div>
  )
}
