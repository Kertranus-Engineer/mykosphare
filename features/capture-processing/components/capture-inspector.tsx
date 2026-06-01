"use client"

import { memo } from "react"
import Image from "next/image"
import {
  Camera,
  Hash,
  Clock,
  HardDrive,
  Monitor,
  Copy,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LIFECYCLE_LABELS, LIFECYCLE_COLORS } from "@/lib/capture-processing/types"
import type { ProcessedCapture } from "@/lib/capture-processing/types"

interface CaptureInspectorProps {
  capture: ProcessedCapture
  onClose?: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return iso
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

const DetailRow = memo(function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
  copyable = false,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
  className?: string
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-foreground/5 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="size-3 text-muted-foreground/40 shrink-0" />
        <span className="text-[10px] text-muted-foreground/50">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={cn(
          "text-[10px] tabular-nums text-foreground/70 truncate max-w-[180px]",
          mono && "font-mono text-[9px]",
          className,
        )}>
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={() => copyToClipboard(value)}
            className="text-muted-foreground/30 hover:text-foreground/60 transition-colors shrink-0"
          >
            <Copy className="size-2.5" />
          </button>
        )}
      </div>
    </div>
  )
})

export const CaptureInspector = memo(function CaptureInspector({
  capture,
  onClose,
}: CaptureInspectorProps) {
  const colors = LIFECYCLE_COLORS[capture.lifecycle]

  return (
    <Card className="transition-all duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Camera className="size-4 text-muted-foreground" />
            Capture Inspector
          </CardTitle>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground/50 hover:text-foreground transition-colors text-[10px]"
            >
              Close
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Thumbnail */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black/20">
          <Image
            src={capture.imageUrl}
            fill
            alt={capture.filename}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          {capture.isDuplicate && (
            <div className="absolute top-2 right-2 rounded-md bg-amber-500/80 px-2 py-0.5 text-[9px] font-semibold text-black">
              <AlertTriangle className="size-2.5 inline mr-1" />
              Duplicate Capture
            </div>
          )}
          <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
            {capture.filename}
          </div>
        </div>

        {/* Lifecycle badge */}
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-semibold rounded px-2 py-0.5", colors.bg, colors.text, colors.border, "border")}>
            {LIFECYCLE_LABELS[capture.lifecycle]}
          </span>
          {capture.isDuplicate && (
            <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
              Duplicate — see {capture.duplicateOfId?.slice(0, 12)}...
            </span>
          )}
        </div>

        {/* Details */}
        <div className="rounded-lg border border-border/20 overflow-hidden">
          <DetailRow icon={Hash} label="Capture ID" value={capture.id} mono copyable />
          <DetailRow icon={Monitor} label="Filename" value={capture.filename} />
          <DetailRow
            icon={Monitor}
            label="Resolution"
            value={capture.width && capture.height ? `${capture.width} × ${capture.height}` : "Unknown"}
          />
          <DetailRow
            icon={Monitor}
            label="Aspect Ratio"
            value={capture.aspectRatio ? `${capture.aspectRatio}:1` : "Unknown"}
          />
          <DetailRow icon={HardDrive} label="File Size" value={formatFileSize(capture.fileSize)} />
          <DetailRow icon={Camera} label="Format" value={capture.format} />
          <DetailRow icon={Clock} label="Uploaded At" value={formatTime(capture.uploadedAt)} />
          <DetailRow icon={Clock} label="Processed At" value={formatTime(capture.processedAt)} />
          <DetailRow icon={Monitor} label="Source" value={capture.source} />
          <DetailRow icon={Hash} label="SHA-256 Hash" value={`${capture.hash.slice(0, 16)}...`} mono copyable className="text-[8px]" />
          <DetailRow icon={Monitor} label="Bucket Path" value={capture.bucketPath} mono className="text-[8px]" />
        </div>

        {/* Source link */}
        <a
          href={capture.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/20 px-3 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <ArrowUpRight className="size-3" />
          Open Original Image
        </a>
      </CardContent>
    </Card>
  )
})
