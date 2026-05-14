"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, CheckCircle2, Clock, Info, XCircle, Activity } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { useRealtimeAlerts } from "@/lib/realtime/subscriptions"
import { cn } from "@/lib/utils"
import type { Alert } from "@/types/database"

const SEVERITY_STYLES: Record<string, { dot: string; pulse: string; border: string; icon: typeof AlertTriangle; badge: string }> = {
  critical: {
    dot: "bg-red-500",
    pulse: "shadow-[0_0_6px_1px] shadow-red-500/40",
    border: "border-red-500/15 bg-red-500/[0.03]",
    icon: XCircle,
    badge: "border-red-500/20 bg-red-500/10 text-red-500",
  },
  warning: {
    dot: "bg-amber-500",
    pulse: "shadow-[0_0_6px_1px] shadow-amber-500/40",
    border: "border-amber-500/15 bg-amber-500/[0.03]",
    icon: AlertTriangle,
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  },
  info: {
    dot: "bg-blue-500",
    pulse: "shadow-[0_0_6px_1px] shadow-blue-500/30",
    border: "border-blue-500/15 bg-blue-500/[0.03]",
    icon: Info,
    badge: "border-blue-500/20 bg-blue-500/10 text-blue-500",
  },
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return "just now"
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`
  return `${Math.floor(ms / 86_400_000)}d ${Math.floor((ms % 86_400_000) / 3_600_000)}h`
}

function formatTime(ts: string | null): string {
  if (!ts) return "—"
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 1000) return "just now"
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function AlertRow({ alert }: { alert: Alert }) {
  const severity = alert.severity ?? "info"
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info
  const Icon = style.icon
  const createdAt = alert.created_at
  const [duration, setDuration] = useState("")

  useEffect(() => {
    function tick() {
      const diff = Date.now() - new Date(createdAt).getTime()
      setDuration(diff > 0 ? formatDuration(diff) : "just now")
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [createdAt])

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-3", style.border)}>
      <div className="flex flex-col items-center gap-1.5 pt-0.5">
        <Icon className="size-4 shrink-0 text-foreground/70" />
        <div className={cn("size-1.5 rounded-full", style.dot, style.pulse)} />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            {alert.title}
          </span>
          <Badge variant="outline" className={cn("h-5 px-1.5 text-[9px] font-semibold tracking-wider uppercase", style.badge)}>
            Active
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground/70">
          {alert.description}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground/50">
          <Activity className="size-2.5" />
          {duration}
        </span>
        <span className="text-[9px] text-muted-foreground/40">
          {formatTime(createdAt)}
        </span>
      </div>
    </div>
  )
}

function ResolvedAlertRow({ alert }: { alert: Alert }) {
  const severity = alert.severity ?? "info"
  const SeverityIcon = severity === "critical" ? XCircle : severity === "warning" ? AlertTriangle : Info
  const resolvedAt = alert.resolved_at
  const durationMs = resolvedAt ? new Date(resolvedAt).getTime() - new Date(alert.created_at).getTime() : null

  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted/20 p-3 transition-colors hover:bg-muted/30">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-500/60" />
        <SeverityIcon className="size-2.5 text-muted-foreground/30" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground/80">
            {alert.title}
          </span>
          <Badge variant="outline" className="h-5 border-emerald-500/15 bg-emerald-500/5 px-1.5 text-[9px] font-semibold tracking-wider text-emerald-500/70 uppercase">
            Resolved
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground/60">
          {alert.description}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {durationMs !== null && (
          <span className="text-[10px] tabular-nums text-muted-foreground/50">
            lasted {formatDuration(durationMs)}
          </span>
        )}
        <span className="text-[9px] text-muted-foreground/40">
          {formatTime(alert.created_at)}
        </span>
      </div>
    </div>
  )
}

export default function AlertsPage() {
  const { data: allAlerts } = useRealtimeAlerts(50)
  const active = allAlerts.filter((a) => !a.resolved)
  const resolved = allAlerts.filter((a) => a.resolved)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Alerts
        </h1>
        <p className="text-sm text-muted-foreground/70">
          Active and historical environmental alerts
        </p>
      </div>

      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="size-4 text-amber-500" />
            Active
            {active.length > 0 && (
              <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                {active.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {active.length > 0 ? (
            <div className="space-y-2">
              {active.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="No active alerts"
              description="All environmental metrics are within normal ranges."
            />
          )}
        </CardContent>
      </Card>

      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            Recent History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resolved.length > 0 ? (
            <div className="space-y-2">
              {resolved.map((alert) => (
                <ResolvedAlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="No resolved alerts"
              description="Resolved alerts will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
