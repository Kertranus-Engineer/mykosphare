"use client"

import { memo } from "react"
import { Check, X, Clock, ScanEye, Activity, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import {
  STATUS_COLORS,
  STATUS_DOT,
  type ValidationRecord,
  type ValidationSourceType,
} from "@/lib/validation/validation-engine"

const SOURCE_ICONS: Record<ValidationSourceType, React.ComponentType<{ className?: string }>> = {
  event: Clock,
  observation: ScanEye,
  trend: Activity,
  recommendation: Lightbulb,
  proposal: Lightbulb,
}

const SOURCE_LABELS: Record<ValidationSourceType, string> = {
  event: "Event",
  observation: "Observation",
  trend: "Trend",
  recommendation: "Recommendation",
  proposal: "Proposal",
}

const STATUS_ICONS = {
  confirmed: Check,
  rejected: X,
  pending: Clock,
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
  } catch {
    return iso
  }
}

const ValidationRow = memo(function ValidationRow({ record }: { record: ValidationRecord }) {
  const statusColor = STATUS_COLORS[record.status]
  const statusDot = STATUS_DOT[record.status]
  const StatusIcon = STATUS_ICONS[record.status]
  const SourceIcon = SOURCE_ICONS[record.sourceType]
  const sourceLabel = SOURCE_LABELS[record.sourceType]

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/10 border-b border-foreground/5 last:border-b-0">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20">
        <SourceIcon className="size-3 text-muted-foreground/50" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full shrink-0", statusDot)} />
          <span className={cn("text-[11px] font-semibold truncate", statusColor)}>
            {record.sourceTitle}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[8px] text-muted-foreground/40 mt-0.5">
          <Clock className="size-2.5" />
          <span className="tabular-nums">{formatTimestamp(record.timestamp)}</span>
          <span className="text-muted-foreground/20">·</span>
          <span className="uppercase tracking-wider text-foreground/30">{sourceLabel}</span>
          <span className="text-muted-foreground/20">·</span>
          <StatusIcon className="size-2.5" />
          <span className={cn(
            "uppercase tracking-wider font-medium",
            record.status === "confirmed" ? "text-emerald-500" :
            record.status === "rejected" ? "text-red-500" :
            "text-muted-foreground/50",
          )}>
            {record.status}
          </span>
        </div>
      </div>
    </div>
  )
})

interface ValidationFeedProps {
  records: ValidationRecord[]
  limit?: number
  emptyMessage?: string
}

export const ValidationFeed = memo(function ValidationFeed({
  records,
  limit = 50,
  emptyMessage = "No validations recorded",
}: ValidationFeedProps) {
  const sorted = [...records].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  const display = sorted.slice(0, limit)

  if (display.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Check}
            title={emptyMessage}
            description="Validate observations, trends, and recommendations to measure pipeline accuracy."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Check className="size-4 text-muted-foreground" />
          Validation
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {records.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-foreground/5 max-h-[480px] overflow-y-auto">
          {display.map((record) => (
            <ValidationRow key={record.id} record={record} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
})
