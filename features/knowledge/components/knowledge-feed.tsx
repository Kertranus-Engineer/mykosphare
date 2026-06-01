"use client"

import { memo } from "react"
import {
  Database,
  Clock,
  ScanEye,
  Activity,
  Lightbulb,
  Settings,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { SOURCE_LABELS, type KnowledgeRecord, type KnowledgeSourceType } from "@/lib/knowledge/knowledge-engine"

const SOURCE_ICONS: Record<KnowledgeSourceType, React.ComponentType<{ className?: string }>> = {
  event: AlertTriangle,
  observation: ScanEye,
  trend: Activity,
  recommendation: Lightbulb,
  proposal: Settings,
  validation: ShieldCheck,
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
  } catch {
    return iso
  }
}

const KnowledgeRow = memo(function KnowledgeRow({ record }: { record: KnowledgeRecord }) {
  const SourceIcon = SOURCE_ICONS[record.sourceType]
  const sourceLabel = SOURCE_LABELS[record.sourceType]

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/10 border-b border-foreground/5 last:border-b-0">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20">
        <SourceIcon className="size-3 text-muted-foreground/50" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold truncate text-foreground/70">
            {record.title}
          </span>
        </div>
        <p className="text-[10px] text-foreground/45 leading-relaxed line-clamp-2">
          {record.summary}
        </p>
        <div className="flex items-center gap-2 text-[8px] text-muted-foreground/30 mt-0.5">
          <Clock className="size-2.5" />
          <span className="tabular-nums">{formatTimestamp(record.timestamp)}</span>
          <span className="text-muted-foreground/20">·</span>
          <span className="uppercase tracking-wider">{sourceLabel}</span>
          {record.severity && (
            <>
              <span className="text-muted-foreground/20">·</span>
              <span className="uppercase tracking-wider">{record.severity}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

interface KnowledgeFeedProps {
  records: KnowledgeRecord[]
  limit?: number
  emptyMessage?: string
}

export const KnowledgeFeed = memo(function KnowledgeFeed({
  records,
  limit = 100,
  emptyMessage = "No knowledge records",
}: KnowledgeFeedProps) {
  const sorted = [...records].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  const display = sorted.slice(0, limit)

  if (display.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Database}
            title={emptyMessage}
            description="Archive the current pipeline state to build system memory over time."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="size-4 text-muted-foreground" />
          Knowledge Feed
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {records.length} records
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-foreground/5 max-h-[480px] overflow-y-auto">
          {display.map((record) => (
            <KnowledgeRow key={record.id} record={record} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
})
