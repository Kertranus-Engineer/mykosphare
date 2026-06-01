"use client"

import { memo, useMemo } from "react"
import { Database, ScanEye, Activity, Lightbulb, Settings, ShieldCheck, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { KnowledgeStats, KnowledgeSourceType } from "@/lib/knowledge/knowledge-engine"

const SOURCE_ICONS: Record<KnowledgeSourceType, React.ComponentType<{ className?: string }>> = {
  event: AlertTriangle,
  observation: ScanEye,
  trend: Activity,
  recommendation: Lightbulb,
  proposal: Settings,
  validation: ShieldCheck,
}

const SOURCE_LABELS: Record<KnowledgeSourceType, string> = {
  event: "Events",
  observation: "Observations",
  trend: "Trends",
  recommendation: "Recs",
  proposal: "Proposals",
  validation: "Validations",
}

interface KnowledgeStatisticsProps {
  stats: KnowledgeStats
}

export const KnowledgeStatistics = memo(function KnowledgeStatistics({
  stats,
}: KnowledgeStatisticsProps) {
  const entries = useMemo(
    () => (Object.entries(stats.bySource) as [KnowledgeSourceType, number][])
      .filter(([, count]) => count > 0),
    [stats.bySource],
  )

  if (stats.total === 0) {
    return (
      <Card size="sm">
        <CardContent className="flex items-center gap-2 py-2.5">
          <Database className="size-3.5 text-muted-foreground/40 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-muted-foreground/40">0</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Knowledge Records</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-sky-500/10 shadow-[0_0_12px_-4px] shadow-sky-500/5">
        <CardContent className="flex items-center gap-2 py-2.5">
          <Database className="size-3.5 text-sky-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tabular-nums leading-none text-sky-500">{stats.total}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Total</span>
          </div>
        </CardContent>
      </Card>

      {entries.map(([type, count]) => {
        const Icon = SOURCE_ICONS[type]
        const label = SOURCE_LABELS[type]
        return (
          <Card key={type} size="sm" className="transition-all duration-300 hover:scale-[1.01] border-foreground/5 shadow-none">
            <CardContent className="flex items-center gap-2 py-2.5">
              <Icon className="size-3.5 text-muted-foreground/40 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tabular-nums leading-none text-foreground/60">{count}</span>
                <span className="text-[9px] font-medium text-foreground/50 tracking-wide">{label}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
})
