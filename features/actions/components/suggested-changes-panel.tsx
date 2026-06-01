"use client"

import { memo } from "react"
import { Settings, TrendingDown, Minus, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { formatProposalDiff, type ActionProposal } from "@/lib/actions/action-proposal-engine"

const PARAMETER_LABELS: Record<string, string> = {
  fan_interval: "Fan Interval",
  heater_target: "Heater Target",
  capture_interval: "Capture Interval",
  sync_interval: "Sync Interval",
}

const PARAMETER_UNITS: Record<string, string> = {
  fan_interval: "s",
  heater_target: "°C",
  capture_interval: "min",
  sync_interval: "s",
}

function formatValue(value: number | string, parameter: string): string {
  const unit = PARAMETER_UNITS[parameter] ?? ""
  return `${value}${unit}`
}

interface SuggestedChangesPanelProps {
  proposals: ActionProposal[]
  emptyMessage?: string
}

export const SuggestedChangesPanel = memo(function SuggestedChangesPanel({
  proposals,
  emptyMessage = "No action proposals at this time",
}: SuggestedChangesPanelProps) {
  if (proposals.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Settings}
            title={emptyMessage}
            description="Action proposals are generated when recommendations identify adjustable parameters."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="size-4 text-muted-foreground" />
          Suggested Changes
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {proposals.map((proposal) => {
          const diff = formatProposalDiff(proposal)
          const parameterLabel = PARAMETER_LABELS[proposal.parameter] ?? proposal.parameter
          const isChange = diff.isChange

          return (
            <div
              key={proposal.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-3 transition-colors",
                isChange ? "border-amber-500/10 bg-amber-500/[0.03]" : "border-foreground/5 bg-muted/10",
              )}
            >
              <div className="flex items-center gap-2">
                <Settings className="size-3 text-muted-foreground/40 shrink-0" />
                <span className="text-[11px] font-semibold text-foreground">{parameterLabel}</span>
                <span className={cn(
                  "ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider",
                  isChange ? "bg-amber-500/10 text-amber-500" : "bg-sky-500/10 text-sky-500",
                )}>
                  {isChange ? "Adjust" : "Maintain"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col gap-0.5 rounded bg-muted/20 py-1.5">
                  <span className="text-[8px] text-muted-foreground/40">Current</span>
                  <span className="text-xs font-bold tabular-nums text-foreground/70">
                    {formatValue(proposal.currentValue, proposal.parameter)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 rounded bg-muted/20 py-1.5">
                  <span className="text-[8px] text-muted-foreground/40">Suggested</span>
                  <span className={cn(
                    "text-xs font-bold tabular-nums",
                    isChange ? "text-emerald-500" : "text-foreground/70",
                  )}>
                    {formatValue(proposal.suggestedValue, proposal.parameter)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 rounded bg-muted/20 py-1.5">
                  <span className="text-[8px] text-muted-foreground/40">Delta</span>
                  {isChange ? (
                    <div className="flex items-center justify-center gap-0.5">
                      <TrendingDown className="size-2.5 text-amber-500/60" />
                      <span className="text-xs font-bold tabular-nums text-amber-500">{diff.numeric}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-0.5">
                      <Minus className="size-2.5 text-sky-500/60" />
                      <span className="text-xs font-bold tabular-nums text-sky-500">—</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-1.5">
                <Target className="size-2.5 text-muted-foreground/30 mt-0.5 shrink-0" />
                <p className="text-[9px] text-foreground/50 leading-relaxed">{proposal.expectedOutcome}</p>
              </div>

              <div className="flex items-center gap-2 text-[9px]">
                <span className="text-muted-foreground/40">Confidence</span>
                <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      proposal.confidence >= 80 ? "bg-emerald-500/60" :
                      proposal.confidence >= 70 ? "bg-amber-500/60" :
                      "bg-red-500/60",
                    )}
                    style={{ width: `${proposal.confidence}%` }}
                  />
                </div>
                <span className="text-foreground/60 font-medium tabular-nums">{proposal.confidence}%</span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
})
