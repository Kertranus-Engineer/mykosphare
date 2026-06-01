"use client"

import { memo } from "react"
import {
  Info,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ScanEye,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import {
  SEVERITY_COLORS,
  SEVERITY_DOT,
  type Observation,
} from "@/lib/observations/observation-engine"

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: ShieldAlert,
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
  } catch {
    return iso
  }
}

const ObservationRow = memo(function ObservationRow({ observation }: { observation: Observation }) {
  const severityColor = SEVERITY_COLORS[observation.severity]
  const severityDot = SEVERITY_DOT[observation.severity]
  const SeverityIcon = SEVERITY_ICONS[observation.severity]

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/10 border-b border-foreground/5 last:border-b-0">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20">
        <ScanEye className="size-3 text-muted-foreground/50" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full shrink-0", severityDot)} />
          <span className={cn("text-[11px] font-semibold truncate", severityColor)}>
            {observation.title}
          </span>
        </div>
        <p className="text-[10px] text-foreground/55 leading-relaxed line-clamp-2">
          {observation.summary}
        </p>
        <div className="flex items-center gap-2 text-[8px] text-muted-foreground/40 mt-0.5">
          <Clock className="size-2.5" />
          <span className="tabular-nums">{formatTimestamp(observation.timestamp)}</span>
          <span className="text-muted-foreground/20">·</span>
          <SeverityIcon className="size-2.5" />
          <span className="uppercase tracking-wider">{observation.severity}</span>
          {observation.sourceEvents.length > 0 && (
            <>
              <span className="text-muted-foreground/20">·</span>
              <span>{observation.sourceEvents.length} event{observation.sourceEvents.length !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

interface ObservationFeedProps {
  observations: Observation[]
  limit?: number
  emptyMessage?: string
}

export const ObservationFeed = memo(function ObservationFeed({
  observations,
  limit = 50,
  emptyMessage = "No observations generated",
}: ObservationFeedProps) {
  const display = observations.slice(0, limit)

  if (display.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={ScanEye}
            title={emptyMessage}
            description="Observations are generated when environmental events exceed thresholds."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ScanEye className="size-4 text-muted-foreground" />
          Observations
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {observations.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-foreground/5 max-h-[480px] overflow-y-auto">
          {display.map((observation) => (
            <ObservationRow key={observation.id} observation={observation} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
})
