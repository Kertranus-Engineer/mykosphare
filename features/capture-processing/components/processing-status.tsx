"use client"

import { memo } from "react"
import { CheckCircle2, Circle, Clock, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CAPTURE_LIFECYCLE_ORDER, LIFECYCLE_LABELS, LIFECYCLE_COLORS } from "@/lib/capture-processing/types"
import type { CaptureLifecycle } from "@/lib/capture-processing/types"

interface ProcessingStatusProps {
  currentLifecycle: CaptureLifecycle
  stats: {
    total: number
    processed: number
    duplicates: number
    failed: number
  }
  loading?: boolean
}

const LIFECYCLE_DESCRIPTIONS: Record<CaptureLifecycle, string> = {
  uploaded: "Image received from Supabase bucket",
  registered: "Capture registered in local registry",
  processed: "Metadata extracted and hash computed",
  analyzed: "AI analysis complete",
}

export const ProcessingStatus = memo(function ProcessingStatus({
  currentLifecycle,
  stats,
  loading = false,
}: ProcessingStatusProps) {
  const currentIdx = CAPTURE_LIFECYCLE_ORDER.indexOf(currentLifecycle)

  return (
    <Card size="sm" className="transition-all duration-300 border-emerald-500/10 shadow-[0_0_16px_-4px] shadow-emerald-500/5">
      <CardContent className="flex flex-col gap-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-emerald-500/60" />
          <span className="text-xs font-semibold tracking-tight text-foreground">Processing Status</span>
          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/50">
            {stats.processed} processed{stats.duplicates > 0 ? ` · ${stats.duplicates} duplicates` : ""}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {CAPTURE_LIFECYCLE_ORDER.map((stage, idx) => {
            const isComplete = idx < currentIdx
            const isCurrent = idx === currentIdx
            const isPending = idx > currentIdx
            const colors = LIFECYCLE_COLORS[stage]

            return (
              <div
                key={stage}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                  isCurrent ? "bg-emerald-500/5 border border-emerald-500/10" : isComplete ? "bg-muted/10" : "bg-muted/5",
                )}
              >
                <div className={cn("flex size-5 items-center justify-center rounded-full shrink-0", colors.bg)}>
                  {loading && isCurrent ? (
                    <Loader2 className="size-3 animate-spin text-emerald-500" />
                  ) : isComplete ? (
                    <CheckCircle2 className="size-3 text-emerald-500" />
                  ) : isCurrent ? (
                    <Circle className={cn("size-3", colors.text)} />
                  ) : (
                    <Circle className="size-3 text-muted-foreground/20" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    "text-[11px] font-medium leading-tight",
                    isComplete ? "text-emerald-500" : isCurrent ? "text-foreground/80" : "text-muted-foreground/40",
                  )}>
                    {LIFECYCLE_LABELS[stage]}
                  </span>
                  <span className="text-[9px] text-muted-foreground/40 leading-tight">
                    {LIFECYCLE_DESCRIPTIONS[stage]}
                  </span>
                </div>
                <span className={cn("ml-auto text-[10px] font-semibold shrink-0", colors.text)}>
                  {isComplete ? "✓" : isCurrent ? (loading ? "..." : "Active") : "Pending"}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})
