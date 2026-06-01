"use client"

import { memo } from "react"
import Image from "next/image"
import { Clock, Gauge, Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ProcessedCapture } from "@/lib/capture-processing/types"
import type { VisualComparison } from "@/lib/visual-analysis/visual-comparison"

function similarityColor(value: number): string {
  if (value >= 80) return "text-emerald-500"
  if (value >= 50) return "text-amber-500"
  return "text-red-500"
}

function similarityBarColor(value: number): string {
  if (value >= 80) return "bg-emerald-500"
  if (value >= 50) return "bg-amber-500"
  return "bg-red-500"
}

interface VisualComparisonCardProps {
  comparison: VisualComparison
  captureA: ProcessedCapture | undefined
  captureB: ProcessedCapture | undefined
}

export const VisualComparisonCard = memo(function VisualComparisonCard({
  comparison,
  captureA,
  captureB,
}: VisualComparisonCardProps) {
  const simWidth = `${comparison.similarity}%`

  return (
    <Card size="sm" className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/20">
            <Activity className="size-3.5 text-muted-foreground/50" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-foreground truncate">
              Visual Comparison
            </span>
            <span className="text-[9px] text-muted-foreground/50">
              Metadata-based analysis
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {captureA && (
            <div className="relative aspect-square rounded-lg overflow-hidden bg-black/10">
              <Image
                src={captureA.imageUrl}
                fill
                alt={captureA.filename}
                className="object-cover"
                sizes="150px"
              />
              <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[8px] text-white/70">
                {captureA.filename.length > 12 ? `${captureA.filename.slice(0, 10)}…` : captureA.filename}
              </div>
            </div>
          )}
          {captureB && (
            <div className="relative aspect-square rounded-lg overflow-hidden bg-black/10">
              <Image
                src={captureB.imageUrl}
                fill
                alt={captureB.filename}
                className="object-cover"
                sizes="150px"
              />
              <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[8px] text-white/70">
                {captureB.filename.length > 12 ? `${captureB.filename.slice(0, 10)}…` : captureB.filename}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground/50">Similarity</span>
            <span className={cn("text-xs font-bold tabular-nums", similarityColor(comparison.similarity))}>
              {comparison.similarity}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full", similarityBarColor(comparison.similarity))}
              style={{ width: simWidth }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 rounded bg-muted/20 px-2 py-1.5">
            <Gauge className="size-3 text-muted-foreground/40" />
            <div className="flex flex-col">
              <span className="text-[8px] text-muted-foreground/40">Difference</span>
              <span className="text-[10px] font-bold tabular-nums text-foreground/70">{comparison.difference}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded bg-muted/20 px-2 py-1.5">
            <Clock className="size-3 text-muted-foreground/40" />
            <div className="flex flex-col">
              <span className="text-[8px] text-muted-foreground/40">Elapsed</span>
              <span className="text-[10px] font-bold tabular-nums text-foreground/70">{comparison.elapsedTimeHours}h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
