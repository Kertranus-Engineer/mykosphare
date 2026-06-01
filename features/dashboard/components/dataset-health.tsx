"use client"

import { memo, useMemo } from "react"
import { Database, HardDrive, Clock, Camera, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useOperationalMode } from "@/lib/operational/mode"

interface DatasetHealthProps {
  totalImages?: number
  storageUsedBytes?: number
  avgCaptureInterval?: number
  firstCapture?: string | null
  latestCapture?: string | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const DatasetHealth = memo(function DatasetHealth({
  totalImages = 0,
  storageUsedBytes = 0,
  avgCaptureInterval = 0,
  firstCapture,
  latestCapture,
}: DatasetHealthProps) {
  const { isLive, isDemo } = useOperationalMode()

  const stats = useMemo(() => {
    if (isDemo) {
      return {
        total: 12,
        storage: "~1.2 MB",
        interval: "24h",
        first: "May 25 2026",
        latest: "Jun 5 2026",
      }
    }

    const first = firstCapture ? new Date(firstCapture) : null
    const latest = latestCapture ? new Date(latestCapture) : null

    return {
      total: totalImages,
      storage: formatBytes(storageUsedBytes),
      interval: avgCaptureInterval > 0 ? `${Math.round(avgCaptureInterval)}h` : "—",
      first: first
        ? `${first.toLocaleDateString("en-US", { month: "short" })} ${first.getDate()} ${first.getFullYear()}`
        : "—",
      latest: latest
        ? `${latest.toLocaleDateString("en-US", { month: "short" })} ${latest.getDate()} ${latest.getFullYear()}`
        : "—",
    }
  }, [isDemo, totalImages, storageUsedBytes, avgCaptureInterval, firstCapture, latestCapture])

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-sky-500/10 shadow-[0_0_12px_-4px] shadow-sky-500/5">
        <CardContent className="flex items-center gap-2 py-2">
          <Camera className="size-3.5 text-sky-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold tracking-tight tabular-nums leading-none text-sky-500">{stats.total}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Total Images</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-violet-500/10 shadow-[0_0_12px_-4px] shadow-violet-500/5">
        <CardContent className="flex items-center gap-2 py-2">
          <HardDrive className="size-3.5 text-violet-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold tracking-tight tabular-nums leading-none text-violet-500">{stats.storage}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Storage Used</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-cyan-500/10 shadow-[0_0_12px_-4px] shadow-cyan-500/5">
        <CardContent className="flex items-center gap-2 py-2">
          <Clock className="size-3.5 text-cyan-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold tracking-tight tabular-nums leading-none text-cyan-500">{stats.interval}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Avg Interval</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-emerald-500/10 shadow-[0_0_12px_-4px] shadow-emerald-500/5">
        <CardContent className="flex items-center gap-2 py-2">
          <Calendar className="size-3.5 text-emerald-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold tracking-tight tabular-nums leading-none text-emerald-500">{stats.first}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">First Capture</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] border-amber-500/10 shadow-[0_0_12px_-4px] shadow-amber-500/5">
        <CardContent className="flex items-center gap-2 py-2">
          <Database className="size-3.5 text-amber-500/60 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold tracking-tight tabular-nums leading-none text-amber-500">{stats.latest}</span>
            <span className="text-[9px] font-medium text-foreground/50 tracking-wide">Latest Capture</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
