"use client"

import { AlertTriangle, Clock, CheckCircle, Eye, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { CARD_HOVER, SEVERITY, scoreToMeta } from "@/lib/styles/tokens"
import { incidentStatusToColor, incidentStatusToBg } from "@/lib/incidents/scoring"
import type { Incident, IncidentActions } from "@/lib/incidents/types"

const STATUS_ICONS: Record<string, typeof AlertTriangle> = {
  open: AlertTriangle,
  acknowledged: Eye,
  mitigating: Wrench,
  resolved: CheckCircle,
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  mitigating: "Mitigating",
  resolved: "Resolved",
}

function formatTimestamp(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

function IncidentTimeline({ incident }: { incident: Incident }) {
  return (
    <div className="space-y-1 mt-2">
      {incident.timeline.slice(0, 4).map((evt) => (
        <div key={evt.id} className="flex items-center gap-2 text-[9px] text-muted-foreground/50">
          <Clock className="size-2.5 shrink-0" />
          <span className="truncate">{evt.description}</span>
          <span className="shrink-0">{formatTimestamp(evt.timestamp)}</span>
        </div>
      ))}
      {incident.timeline.length > 4 && (
        <div className="text-[9px] text-muted-foreground/30 pl-4">
          +{incident.timeline.length - 4} more events
        </div>
      )}
    </div>
  )
}

export function IncidentCard({
  incident,
  actions,
}: {
  incident: Incident
  actions: IncidentActions
}) {
  const statusColor = incidentStatusToColor(incident.status)
  const statusBg = incidentStatusToBg(incident.status)
  const StatusIcon = STATUS_ICONS[incident.status] ?? AlertTriangle
  const severityMeta = SEVERITY[incident.severity as keyof typeof SEVERITY]
  const scoreMeta = scoreToMeta(incident.score)

  return (
    <div className={cn("rounded-xl border border-border/50 bg-card p-3", CARD_HOVER)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon className={cn("size-4 shrink-0", statusColor)} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium text-foreground truncate">{incident.title}</span>
              <span className={cn("rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider", statusBg, statusColor)}>
                {STATUS_LABELS[incident.status] ?? incident.status}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground/60 line-clamp-1">{incident.description}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-1">
          {severityMeta && <div className={cn("size-2 rounded-full", severityMeta.dot)} />}
          <span className={cn("text-[10px] font-medium capitalize", severityMeta?.color)}>{incident.severity}</span>
        </div>
        <span className="text-[10px] text-muted-foreground/50">Score: {incident.score}</span>
        <span className="text-[10px] text-muted-foreground/50 capitalize">{incident.correlationType}</span>
        <span className="text-[10px] text-muted-foreground/50">{incident.alertIds.length} alerts</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", scoreMeta.bar)} style={{ width: `${incident.score}%` }} />
        </div>
        <span className={cn("text-[10px] tabular-nums font-medium", scoreMeta.color)}>{incident.score}</span>
      </div>

      <IncidentTimeline incident={incident} />

      {incident.status !== "resolved" && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
          {incident.status === "open" && (
            <button
              onClick={() => actions.acknowledge(incident.id)}
              className="flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[9px] font-medium text-amber-500 hover:bg-amber-500/20 transition-colors"
            >
              <Eye className="size-3" />
              Acknowledge
            </button>
          )}
          {incident.status === "acknowledged" && (
            <button
              onClick={() => actions.startMitigation(incident.id)}
              className="flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-1 text-[9px] font-medium text-blue-500 hover:bg-blue-500/20 transition-colors"
            >
              <Wrench className="size-3" />
              Mitigate
            </button>
          )}
          {incident.status === "mitigating" && (
            <button
              onClick={() => actions.resolve(incident.id)}
              className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[9px] font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors"
            >
              <CheckCircle className="size-3" />
              Resolve
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function IncidentPanel({
  incidents,
  actions,
}: {
  incidents: Incident[]
  actions: IncidentActions
}) {
  const active = incidents.filter((i) => i.status !== "resolved")
  const resolved = incidents.filter((i) => i.status === "resolved")

  return (
    <div className="flex flex-col gap-3">
      {active.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-3.5 text-red-500" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
              Active Incidents ({active.length})
            </span>
          </div>
          <div className="space-y-2">
            {active.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} actions={actions} />
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="size-3.5 text-emerald-500" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
              Resolved ({resolved.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {resolved.map((inc) => (
              <div key={inc.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-2.5 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="size-3 text-emerald-500/60 shrink-0" />
                  <span className="text-[10px] text-muted-foreground/80 truncate">{inc.title}</span>
                </div>
                <span className="text-[9px] text-muted-foreground/40 shrink-0">{inc.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {incidents.length === 0 && (
        <div className="py-8 text-center">
          <CheckCircle className="size-8 text-emerald-500/30 mx-auto mb-2" />
          <p className="text-[11px] text-muted-foreground/50">No incidents — all systems nominal</p>
        </div>
      )}
    </div>
  )
}
