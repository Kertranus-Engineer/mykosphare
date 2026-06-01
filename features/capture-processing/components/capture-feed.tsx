"use client"

import { memo } from "react"
import Image from "next/image"
import { Camera, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LIFECYCLE_LABELS, LIFECYCLE_COLORS } from "@/lib/capture-processing/types"
import type { ProcessedCapture } from "@/lib/capture-processing/types"

interface CaptureFeedProps {
  captures: ProcessedCapture[]
  duplicates: ProcessedCapture[]
  onSelect: (capture: ProcessedCapture) => void
  selectedId?: string
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
  } catch {
    return iso
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const CaptureRow = memo(function CaptureRow({
  capture,
  onSelect,
  isSelected,
}: {
  capture: ProcessedCapture
  onSelect: (c: ProcessedCapture) => void
  isSelected: boolean
}) {
  const colors = LIFECYCLE_COLORS[capture.lifecycle]

  return (
    <button
      type="button"
      onClick={() => onSelect(capture)}
      className={cn(
        "flex items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-muted/20 w-full focus:outline-none",
        isSelected && "bg-muted/30 ring-1 ring-emerald-500/20",
        capture.isDuplicate && "opacity-50",
      )}
    >
      <div className="relative size-14 shrink-0 rounded-md overflow-hidden bg-black/20">
        <Image
          src={capture.imageUrl}
          fill
          alt={capture.filename}
          className="object-cover"
          sizes="56px"
        />
        {capture.isDuplicate && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <AlertTriangle className="size-3 text-amber-500" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-foreground/70 truncate">
            {capture.filename}
          </span>
          {capture.isDuplicate && (
            <span className="text-[9px] font-medium text-amber-500 bg-amber-500/10 rounded px-1 py-px shrink-0">
              DUP
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground/50">
          <Clock className="size-2.5" />
          {formatTime(capture.uploadedAt)}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[9px] font-medium rounded px-1 py-px", colors.bg, colors.text)}>
            {LIFECYCLE_LABELS[capture.lifecycle]}
          </span>
          {capture.width && capture.height && (
            <span className="text-[8px] text-muted-foreground/40">
              {capture.width}×{capture.height}
            </span>
          )}
          <span className="text-[8px] text-muted-foreground/40">
            {formatFileSize(capture.fileSize)}
          </span>
        </div>
      </div>
    </button>
  )
})

export const CaptureFeed = memo(function CaptureFeed({
  captures,
  duplicates,
  onSelect,
  selectedId,
}: CaptureFeedProps) {
  const all = [...captures, ...duplicates].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  )

  if (all.length === 0) {
    return (
      <Card size="sm">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-8">
          <Camera className="size-6 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground/50">No captures processed yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card size="sm">
      <CardContent className="py-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Camera className="size-3.5 text-emerald-500/60" />
          <span className="text-[10px] font-semibold text-foreground/70">Capture Feed</span>
          <span className="ml-auto text-[9px] tabular-nums text-muted-foreground/50">
            {captures.length} captures{duplicates.length > 0 ? ` · ${duplicates.length} duplicates` : ""}
          </span>
        </div>
        <div className="divide-y divide-foreground/5">
          {all.slice(0, 50).map((capture) => (
            <CaptureRow
              key={capture.id}
              capture={capture}
              onSelect={onSelect}
              isSelected={capture.id === selectedId}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
})
