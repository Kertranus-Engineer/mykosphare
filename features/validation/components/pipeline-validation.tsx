"use client"

import { memo } from "react"
import { Check, X, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Observation } from "@/lib/observations/observation-engine"
import type { Trend } from "@/lib/trends/trend-engine"
import type { Recommendation } from "@/lib/recommendations/recommendation-engine"
import type { ValidationStatus } from "@/lib/validation/validation-engine"

function ValidationButton({
  status,
  onConfirm,
  onReject,
}: {
  status: ValidationStatus | null
  onConfirm: () => void
  onReject: () => void
}) {
  if (status === "confirmed") {
    return (
      <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-500">
        <Check className="size-3" />
        Confirmed
      </span>
    )
  }
  if (status === "rejected") {
    return (
      <span className="flex items-center gap-1 text-[9px] font-medium text-red-500">
        <X className="size-3" />
        Rejected
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onConfirm}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-emerald-500 hover:bg-emerald-500/10 transition-colors"
        title="Mark as accurate"
      >
        <Check className="size-3" />
        Accurate
      </button>
      <button
        type="button"
        onClick={onReject}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
        title="Mark as inaccurate"
      >
        <X className="size-3" />
        Inaccurate
      </button>
    </div>
  )
}

const ValidationRow = memo(function ValidationRow({
  icon: Icon,
  title,
  summary,
  status,
  sourceLabel,
  onConfirm,
  onReject,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  summary: string
  status: ValidationStatus | null
  sourceLabel: string
  onConfirm: () => void
  onReject: () => void
}) {
  return (
    <div className={cn(
      "flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 transition-colors",
      status === "confirmed" ? "border-emerald-500/15 bg-emerald-500/[0.03]" :
      status === "rejected" ? "border-red-500/15 bg-red-500/[0.03]" :
      "border-foreground/5",
    )}>
      <div className="flex items-center gap-2">
        <Icon className={cn(
          "size-3",
          status === "confirmed" ? "text-emerald-500/60" :
          status === "rejected" ? "text-red-500/60" :
          "text-muted-foreground/40",
        )} />
        <span className="text-[10px] text-muted-foreground/50">{sourceLabel}</span>
        <ValidationButton
          status={status}
          onConfirm={onConfirm}
          onReject={onReject}
        />
      </div>
      <p className="text-[10px] text-foreground/60 leading-relaxed line-clamp-2">{title}</p>
      <p className="text-[9px] text-foreground/40 leading-relaxed">{summary}</p>
    </div>
  )
})

interface PipelineValidationProps {
  observation: Observation | null
  trend: Trend | null
  recommendation: Recommendation | null
  getObservationStatus: (id: string) => ValidationStatus | null
  getTrendStatus: (id: string) => ValidationStatus | null
  getRecommendationStatus: (id: string) => ValidationStatus | null
  onConfirmObservation: (observation: Observation) => void
  onRejectObservation: (observation: Observation) => void
  onConfirmTrend: (trend: Trend) => void
  onRejectTrend: (trend: Trend) => void
  onConfirmRecommendation: (rec: Recommendation) => void
  onRejectRecommendation: (rec: Recommendation) => void
}

export const PipelineValidation = memo(function PipelineValidation({
  observation,
  trend,
  recommendation,
  getObservationStatus,
  getTrendStatus,
  getRecommendationStatus,
  onConfirmObservation,
  onRejectObservation,
  onConfirmTrend,
  onRejectTrend,
  onConfirmRecommendation,
  onRejectRecommendation,
}: PipelineValidationProps) {
  const hasItems = observation || trend || recommendation

  if (!hasItems) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-4 text-muted-foreground" />
            Pipeline Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <ShieldCheck className="size-5 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/40">No items to validate yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const items: Array<{
    key: string
    icon: React.ComponentType<{ className?: string }>
    title: string
    summary: string
    status: ValidationStatus | null
    sourceLabel: string
    onConfirm: () => void
    onReject: () => void
  }> = []

  if (observation) {
    items.push({
      key: `obs-${observation.id}`,
      icon: ShieldCheck,
      title: observation.title,
      summary: observation.summary,
      status: getObservationStatus(observation.id),
      sourceLabel: "Observation",
      onConfirm: () => onConfirmObservation(observation),
      onReject: () => onRejectObservation(observation),
    })
  }

  if (trend) {
    items.push({
      key: `trd-${trend.id}`,
      icon: ShieldCheck,
      title: trend.title,
      summary: trend.summary,
      status: getTrendStatus(trend.id),
      sourceLabel: "Trend",
      onConfirm: () => onConfirmTrend(trend),
      onReject: () => onRejectTrend(trend),
    })
  }

  if (recommendation) {
    items.push({
      key: `rec-${recommendation.id}`,
      icon: ShieldCheck,
      title: recommendation.title,
      summary: recommendation.description,
      status: getRecommendationStatus(recommendation.id),
      sourceLabel: "Recommendation",
      onConfirm: () => onConfirmRecommendation(recommendation),
      onReject: () => onRejectRecommendation(recommendation),
    })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-muted-foreground" />
          Pipeline Validation
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {items.map(({ key, ...item }) => (
          <ValidationRow key={key} {...item} />
        ))}
      </CardContent>
    </Card>
  )
})
