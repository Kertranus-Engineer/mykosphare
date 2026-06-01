"use client"

import { memo } from "react"
import {
  ArrowRight,
  Settings,
  Target,
  TrendingDown,
  Minus,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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

interface ActionProposalCardProps {
  proposal: ActionProposal
}

export const ActionProposalCard = memo(function ActionProposalCard({
  proposal,
}: ActionProposalCardProps) {
  const diff = formatProposalDiff(proposal)
  const parameterLabel = PARAMETER_LABELS[proposal.parameter] ?? proposal.parameter
  const isChange = diff.isChange

  return (
    <Card size="sm" className="transition-all duration-200 hover:scale-[1.01]">
      <CardContent className="flex flex-col gap-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/20">
            <Settings className="size-3.5 text-muted-foreground/50" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-foreground truncate">
              {parameterLabel}
            </span>
            <span className="text-[9px] text-muted-foreground/50">
              {isChange ? "Suggested adjustment" : "Maintain current value"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Target className="size-3 text-muted-foreground/30" />
            <span className="text-[10px] font-medium tabular-nums text-foreground/60">
              {proposal.confidence}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted/10 px-3 py-2">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-muted-foreground/40">Current</span>
            <span className="text-sm font-bold tabular-nums text-foreground/70">
              {formatValue(proposal.currentValue, proposal.parameter)}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            {isChange ? (
              <TrendingDown className="size-3 text-amber-500/60" />
            ) : (
              <Minus className="size-3 text-sky-500/60" />
            )}
            <span className={cn(
              "text-[9px] font-medium tabular-nums",
              isChange ? "text-amber-500" : "text-sky-500",
            )}>
              {isChange ? diff.numeric : "—"}
            </span>
          </div>
          <ArrowRight className="size-3 text-muted-foreground/20 shrink-0" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-muted-foreground/40">Suggested</span>
            <span className={cn(
              "text-sm font-bold tabular-nums",
              isChange ? "text-emerald-500" : "text-foreground/70",
            )}>
              {formatValue(proposal.suggestedValue, proposal.parameter)}
            </span>
          </div>
          {isChange && (
            <span className="ml-auto text-[9px] font-medium text-foreground/40 tabular-nums">
              {diff.percent}
            </span>
          )}
        </div>

        <div className="flex items-start gap-1.5">
          <Target className="size-3 text-muted-foreground/30 mt-0.5 shrink-0" />
          <p className="text-[10px] text-foreground/55 leading-relaxed">
            {proposal.expectedOutcome}
          </p>
        </div>
      </CardContent>
    </Card>
  )
})
