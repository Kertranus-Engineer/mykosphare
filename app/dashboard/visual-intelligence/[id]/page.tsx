"use client"

import { use, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Brain,
  Clock,
  Thermometer,
  Droplets,
  Hash,
  Gauge,
  Microscope,
  Sprout,
  ShieldCheck,
  AlertTriangle,
  CircleCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Radio,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getSnapshotById } from "@/mock/visual-snapshots"
import type { VisualStatus, GrowthTrend, GrowthStage } from "@/mock/visual-snapshots"

const STATUS_STYLES: Record<VisualStatus, { badge: string; label: string; icon: typeof ShieldCheck; text: string }> = {
  healthy: { badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500", label: "Healthy", icon: CircleCheck, text: "text-emerald-500" },
  warning: { badge: "border-amber-500/20 bg-amber-500/10 text-amber-500", label: "Warning", icon: AlertTriangle, text: "text-amber-500" },
  critical: { badge: "border-red-500/20 bg-red-500/10 text-red-500", label: "Critical", icon: ShieldCheck, text: "text-red-500" },
}

const GROWTH_STAGE_LABELS: Record<GrowthStage, { label: string; icon: typeof Sprout; color: string }> = {
  inoculation: { label: "Inoculation", icon: Sprout, color: "text-blue-400" },
  colonization: { label: "Colonization", icon: Sprout, color: "text-emerald-400" },
  consolidation: { label: "Consolidation", icon: Sprout, color: "text-emerald-500" },
  primordia: { label: "Primordia", icon: Sprout, color: "text-lime-400" },
  fruiting: { label: "Fruiting", icon: Sprout, color: "text-green-400" },
  harvest: { label: "Harvest", icon: CircleCheck, color: "text-emerald-300" },
}

const GROWTH_STYLES: Record<GrowthTrend, { label: string; icon: typeof TrendingUp; color: string }> = {
  accelerating: { label: "Accelerating", icon: TrendingUp, color: "text-emerald-500" },
  stable: { label: "Stable", icon: Minus, color: "text-sky-500" },
  slowing: { label: "Slowing", icon: TrendingDown, color: "text-amber-500" },
  unknown: { label: "Unknown", icon: Minus, color: "text-muted-foreground/50" },
}

function formatTemp(v: number) { return `${v.toFixed(1)}°C` }
function formatHumidity(v: number) { return `${v.toFixed(1)}%` }
function formatCO2(v: number) { return `${v} ppm` }

export default function SnapshotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const snapshot = useMemo(() => getSnapshotById(id), [id])

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Microscope className="size-10 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground/50">Snapshot not found</p>
        <Link href="/dashboard/visual-intelligence" className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="size-3" />Back to Visual Intelligence
        </Link>
      </div>
    )
  }

  const st = STATUS_STYLES[snapshot.status]
  const StatusIcon = st.icon
  const gs = snapshot.growthTrend ? GROWTH_STYLES[snapshot.growthTrend] : null
  const gStage = snapshot.growthStage ? GROWTH_STAGE_LABELS[snapshot.growthStage] : null
  const StageIcon = gStage?.icon ?? Sprout

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back link + title */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/visual-intelligence" className="flex items-center gap-1 rounded-lg bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 transition-colors">
          <ArrowLeft className="size-3" />Back
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{snapshot.id}</h1>
          <p className="text-sm text-muted-foreground/70">{snapshot.timestamp}</p>
        </div>
      </div>

      {/* Image + Metadata grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Image */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black/20">
                {snapshot.imageUrl ? (
                  <Image
                    src={snapshot.imageUrl}
                    fill
                    alt={`Snapshot ${snapshot.id}`}
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    priority
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Microscope className="size-12 text-muted-foreground/10" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Status + Growth */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="size-4 text-muted-foreground" />
                Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon className={cn("size-4", st.text)} />
                  <Badge variant="outline" className={cn("h-5 px-2 text-[10px] font-semibold", st.badge)}>{st.label}</Badge>
                </div>
                <span className="text-sm font-bold tabular-nums text-foreground">{snapshot.confidence}%</span>
              </div>

              <p className="text-xs text-foreground/70 leading-relaxed">{snapshot.observation}</p>

              {snapshot.indicators && (
                <div className="flex flex-wrap gap-1.5">
                  {snapshot.indicators.map((ind, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-1 text-[10px] text-foreground/60">
                      <span className="size-1 rounded-full bg-emerald-500" />{ind}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Growth */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sprout className="size-4 text-muted-foreground" />
                Growth
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {gStage && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/50">Stage</span>
                  <span className={cn("text-xs font-medium flex items-center gap-1.5", gStage.color)}>
                    <StageIcon className="size-3" />{gStage.label}
                  </span>
                </div>
              )}

              {snapshot.growthPercent !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/50">Progress</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-foreground">{snapshot.growthPercent}%</span>
                    <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400" style={{ width: `${snapshot.growthPercent}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {gs && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/50">Trend</span>
                  <span className={cn("text-xs font-medium flex items-center gap-1", gs.color)}>
                    <gs.icon className="size-3" />{gs.label}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sensors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Gauge className="size-4 text-muted-foreground" />
                Sensors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground/50 flex items-center gap-1.5"><Thermometer className="size-3 text-amber-500/60" />Temperature</span>
                <span className="text-sm font-mono tabular-nums text-foreground/80">{formatTemp(snapshot.temperature)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground/50 flex items-center gap-1.5"><Droplets className="size-3 text-cyan-500/60" />Humidity</span>
                <span className="text-sm font-mono tabular-nums text-foreground/80">{formatHumidity(snapshot.humidity)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground/50 flex items-center gap-1.5"><Hash className="size-3 text-slate-500/60" />CO₂</span>
                <span className="text-sm font-mono tabular-nums text-foreground/80">{formatCO2(snapshot.co2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="size-4 text-muted-foreground" />
                Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground/50">ID</span>
                <span className="font-mono text-[10px] text-foreground/70">{snapshot.id}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground/50 flex items-center gap-1"><Clock className="size-3" />Timestamp</span>
                <span className="text-[10px] tabular-nums text-foreground/70">{snapshot.timestamp}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground/50 flex items-center gap-1"><Radio className="size-3" />Source</span>
                <span className="text-[10px] text-foreground/70 capitalize">{snapshot.source}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground/50">Analysis</span>
                <span className={cn("text-[10px] font-medium", snapshot.analysisStatus === "completed" ? "text-emerald-500" : snapshot.analysisStatus === "pending" ? "text-amber-500" : "text-muted-foreground/50")}>
                  {snapshot.analysisStatus}
                </span>
              </div>
              {snapshot.sessionId && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/50">Session</span>
                  <span className="font-mono text-[10px] text-foreground/70">{snapshot.sessionId}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
