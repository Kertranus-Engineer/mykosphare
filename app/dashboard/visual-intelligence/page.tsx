"use client"

import { useState, useMemo, useCallback } from "react"
import { Grid3X3, List } from "lucide-react"

import { cn } from "@/lib/utils"
import { useSnapshots, useSnapshotsWindow, useDataSource } from "@/mock/visual-snapshots"
import type { VisualSnapshot, GrowthTrend, GrowthStage } from "@/mock/visual-snapshots"
import { useOperationalMode } from "@/lib/operational/mode"
import { AutonomousPlaceholder } from "@/features/live/autonomous-placeholder"

import { LiveSnapshotsSection } from "@/features/visual-intelligence/components/live-snapshots-section"
import { DemoSection } from "@/features/visual-intelligence/components/demo-section"
import { GALLERY_PAGE_SIZE, TIMELINE_PAGE_SIZE, GROWTH_STAGE_LABELS } from "@/features/visual-intelligence/utils"

export default function VisualIntelligencePage() {
  const { isDemo, isLive, isAutonomous } = useOperationalMode()
  const allSnapshots = useSnapshots()
  const gallery = useSnapshotsWindow(GALLERY_PAGE_SIZE)
  const timeline = useSnapshotsWindow(TIMELINE_PAGE_SIZE)
  const [dataSource, setDataSource] = useDataSource()
  const [selected, setSelected] = useState<VisualSnapshot | null>(null)
  const [view, setView] = useState<"gallery" | "timeline">("gallery")
  const [viewerOpen, setViewerOpen] = useState(false)

  const selectedIndex = useMemo(() => selected ? allSnapshots.findIndex((s) => s.id === selected.id) : -1, [selected, allSnapshots])
  const previousSnapshot = selected && selectedIndex > 0 ? allSnapshots[selectedIndex - 1] : null
  const latestSnapshot = allSnapshots[allSnapshots.length - 1] ?? null

  const effectiveSelected = selected ?? latestSnapshot
  const effectiveIndex = useMemo(() => effectiveSelected ? allSnapshots.findIndex((s) => s.id === effectiveSelected.id) : -1, [effectiveSelected, allSnapshots])
  const effectivePrevious = effectiveSelected && effectiveIndex > 0 ? allSnapshots[effectiveIndex - 1] : null

  const avgConfidence = useMemo(() => {
    const withConf = allSnapshots.filter((s) => s.confidence > 0)
    if (withConf.length === 0) return 0
    return Math.round(withConf.reduce((a, s) => a + s.confidence, 0) / withConf.length)
  }, [allSnapshots])

  const overallGrowthTrend = useMemo((): GrowthTrend => {
    const recent = allSnapshots.slice(-6).map((s) => s.growthTrend).filter(Boolean) as GrowthTrend[]
    const accel = recent.filter((t) => t === "accelerating").length
    const slow = recent.filter((t) => t === "slowing").length
    if (recent.length === 0) return "unknown"
    if (accel >= 4) return "accelerating"
    if (slow >= 4) return "slowing"
    return "stable"
  }, [allSnapshots])

  const currentGrowthStage = useMemo((): GrowthStage | undefined => {
    return latestSnapshot?.growthStage
  }, [latestSnapshot])

  const overallGrowthPercent = useMemo(() => {
    return latestSnapshot?.growthPercent ?? null
  }, [latestSnapshot])

  const healthyCount = useMemo(() => allSnapshots.filter((s) => s.status === "healthy").length, [allSnapshots])
  const flaggedCount = useMemo(() => allSnapshots.filter((s) => s.status === "warning" || s.status === "critical").length, [allSnapshots])
  const avgTemp = useMemo(() => allSnapshots.length > 0 ? allSnapshots.reduce((a, s) => a + s.temperature, 0) / allSnapshots.length : 0, [allSnapshots])

  const handleSelect = useCallback((s: VisualSnapshot) => {
    setSelected(s)
    setViewerOpen(true)
  }, [])

  const handleViewChange = useCallback((v: "gallery" | "timeline") => {
    setView(v)
    if (v === "gallery") gallery.reset()
    else timeline.reset()
  }, [gallery, timeline])

  const dataSetStats = useMemo(() => {
    const withConf = allSnapshots.filter((s) => s.confidence > 0)
    const avgConf = withConf.length > 0 ? Math.round(withConf.reduce((a, s) => a + s.confidence, 0) / withConf.length) : 0
    const firstTs = allSnapshots.length > 0 ? allSnapshots[0].timestamp : null
    const lastTs = allSnapshots.length > 0 ? allSnapshots[allSnapshots.length - 1].timestamp : null
    const daysTracked = allSnapshots.length >= 2
      ? Math.round(
          (new Date(allSnapshots[allSnapshots.length - 1].capturedAt).getTime() -
            new Date(allSnapshots[0].capturedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0
    const latestProgress = latestSnapshot?.growthPercent ?? 0
    const stage = latestSnapshot?.growthStage
      ? GROWTH_STAGE_LABELS[latestSnapshot.growthStage].label
      : "N/A"
    const healthScore = allSnapshots.length > 0 ? Math.round((healthyCount / allSnapshots.length) * 100) : 100
    return { total: allSnapshots.length, firstTs, lastTs, avgConf, stage, latestProgress, healthScore, daysTracked }
  }, [allSnapshots, healthyCount, latestSnapshot])

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Visual Intelligence</h1>
          <p className="text-sm text-muted-foreground/70">
            {isAutonomous ? "Future autonomous visual pipeline" : isLive ? "Live cultivation image monitoring" : "AI-powered visual monitoring and growth analysis"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-0.5">
            <button type="button" onClick={() => setDataSource("demo")} className={cn("rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors", dataSource === "demo" ? "bg-card text-foreground ring-1 ring-foreground/10 shadow-sm" : "text-muted-foreground/60 hover:text-muted-foreground")}>
              Demo
            </button>
            <button type="button" onClick={() => setDataSource("test")} className={cn("rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors", dataSource === "test" ? "bg-card text-foreground ring-1 ring-foreground/10 shadow-sm" : "text-muted-foreground/60 hover:text-muted-foreground")}>
              Test
            </button>
            <button type="button" onClick={() => setDataSource("real")} className={cn("rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors", dataSource === "real" ? "bg-card text-foreground ring-1 ring-foreground/10 shadow-sm" : "text-muted-foreground/60 hover:text-muted-foreground")}>
              Real Data
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-0.5">
            <button type="button" onClick={() => handleViewChange("gallery")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors", view === "gallery" ? "bg-card text-foreground ring-1 ring-foreground/10 shadow-sm" : "text-muted-foreground/60 hover:text-muted-foreground")}>
              <Grid3X3 className="size-3" />Gallery
            </button>
            <button type="button" onClick={() => handleViewChange("timeline")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors", view === "timeline" ? "bg-card text-foreground ring-1 ring-foreground/10 shadow-sm" : "text-muted-foreground/60 hover:text-muted-foreground")}>
              <List className="size-3" />Timeline
            </button>
          </div>
        </div>
      </div>

      {/* ── Autonomous Mode Placeholder ────────── */}
      {isAutonomous && <AutonomousPlaceholder />}

      {/* ── Live Mode Supabase Snapshots ───────── */}
      {isLive && <LiveSnapshotsSection />}

      {/* ── Demo Mode Content ──────────────────── */}
      {isDemo && (
        <DemoSection
          allSnapshots={allSnapshots}
          dataSource={dataSource}
          setDataSource={setDataSource}
          selected={selected}
          setSelected={setSelected}
          viewerOpen={viewerOpen}
          setViewerOpen={setViewerOpen}
          latestSnapshot={latestSnapshot}
          overallGrowthTrend={overallGrowthTrend}
          currentGrowthStage={currentGrowthStage}
          overallGrowthPercent={overallGrowthPercent}
          avgConfidence={avgConfidence}
          healthyCount={healthyCount}
          flaggedCount={flaggedCount}
          avgTemp={avgTemp}
          dataSetStats={dataSetStats}
          selectedIndex={selectedIndex}
          previousSnapshot={previousSnapshot}
          effectiveSelected={effectiveSelected}
          effectiveIndex={effectiveIndex}
          effectivePrevious={effectivePrevious}
          handleSelect={handleSelect}
          view={view}
          setView={setView}
          gallery={gallery}
          timeline={timeline}
        />
      )}
    </div>
  )
}
