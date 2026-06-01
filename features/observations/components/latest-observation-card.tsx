"use client"

import { memo } from "react"
import {
  Info,
  AlertTriangle,
  ShieldAlert,
  ScanEye,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  SEVERITY_COLORS,
  SEVERITY_BG,
  type Observation,
} from "@/lib/observations/observation-engine"

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: ShieldAlert,
}

const SEVERITY_LABELS = {
  info: "Stable",
  warning: "Attention",
  critical: "Critical",
} as const

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

interface LatestObservationCardProps {
  observation: Observation | null
}

export const LatestObservationCard = memo(function LatestObservationCard({
  observation,
}: LatestObservationCardProps) {
  if (!observation) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ScanEye className="size-4 text-muted-foreground" />
            Latest Observation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <ScanEye className="size-5 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/40">No observations yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const severityColor = SEVERITY_COLORS[observation.severity]
  const severityBg = SEVERITY_BG[observation.severity]
  const SeverityIcon = SEVERITY_ICONS[observation.severity]
  const severityLabel = SEVERITY_LABELS[observation.severity]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ScanEye className="size-4 text-muted-foreground" />
          Latest Observation
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {formatTimestamp(observation.timestamp)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("flex items-start gap-3 rounded-lg border p-3", severityBg)}>
          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", severityBg)}>
            <SeverityIcon className={cn("size-4", severityColor)} />
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-semibold", severityColor)}>
                {observation.title}
              </span>
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider",
                observation.severity === "info" ? "bg-sky-500/15 text-sky-500" :
                observation.severity === "warning" ? "bg-amber-500/15 text-amber-500" :
                "bg-red-500/15 text-red-500",
              )}>
                {severityLabel}
              </span>
            </div>
            <p className="text-[11px] text-foreground/65 leading-relaxed">
              {observation.summary}
            </p>
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40 mt-1">
              <Clock className="size-2.5" />
              <span>{formatTimestamp(observation.timestamp)}</span>
              {observation.sourceEvents.length > 0 && (
                <>
                  <span className="text-muted-foreground/20">·</span>
                  <span>{observation.sourceEvents.length} source event{observation.sourceEvents.length !== 1 ? "s" : ""}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
