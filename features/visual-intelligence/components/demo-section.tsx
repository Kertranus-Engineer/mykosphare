"use client"

import Image from "next/image"
import {
  Camera,
  Thermometer,
  Clock,
  Brain,
  ScanEye,
  List,
  Grid3X3,
  Gauge,
  AlertTriangle,
  CircleCheck,
  Sprout,
  Activity,
  Database,
  Microscope,
  Layers,
  Upload,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { VisualSnapshot, GrowthTrend, GrowthStage } from "@/mock/visual-snapshots"

import { useSnapshotsWindow } from "@/mock/visual-snapshots"
import { VisualUpload } from "@/features/visual-intelligence/components/visual-upload"

import { AIRecommendationsPanel } from "@/features/visual-intelligence/components/ai-recommendations-panel"
import { AutomationReadiness } from "@/features/visual-intelligence/components/automation-readiness"

import { ConfidenceSparkline } from "@/features/visual-intelligence/components/confidence-sparkline"
import { GalleryCard } from "@/features/visual-intelligence/components/gallery-card"
import { TimelineRow } from "@/features/visual-intelligence/components/timeline-row"
import { SnapshotViewer } from "@/features/visual-intelligence/components/snapshot-viewer"
import { HeroAssessment } from "@/features/visual-intelligence/components/hero-assessment"
import { GrowthJourney } from "@/features/visual-intelligence/components/growth-journey"
import { ObservationPanel } from "@/features/visual-intelligence/components/observation-panel"
import { ComparisonCard } from "@/features/visual-intelligence/components/comparison-card"
import {
  GALLERY_PAGE_SIZE,
  TIMELINE_PAGE_SIZE,
  formatTemp,
  formatHumidity,
  formatCO2,
  STATUS_STYLES,
  GROWTH_STYLES,
  GROWTH_STAGE_LABELS,
  confColor,
} from "@/features/visual-intelligence/utils"

interface DataSetStats {
  total: number
  firstTs: string | null
  lastTs: string | null
  avgConf: number
  stage: string
  latestProgress: number
  healthScore: number
  daysTracked: number
}

interface DemoSectionProps {
  allSnapshots: VisualSnapshot[]
  dataSource: "demo" | "test" | "real"
  setDataSource: (s: "demo" | "test" | "real") => void
  selected: VisualSnapshot | null
  setSelected: (s: VisualSnapshot | null) => void
  viewerOpen: boolean
  setViewerOpen: (v: boolean) => void
  latestSnapshot: VisualSnapshot | null
  overallGrowthTrend: GrowthTrend
  currentGrowthStage: GrowthStage | undefined
  overallGrowthPercent: number | null
  avgConfidence: number
  healthyCount: number
  flaggedCount: number
  avgTemp: number
  dataSetStats: DataSetStats
  selectedIndex: number
  previousSnapshot: VisualSnapshot | null
  effectiveSelected: VisualSnapshot | null
  effectiveIndex: number
  effectivePrevious: VisualSnapshot | null
  handleSelect: (s: VisualSnapshot) => void
  view: "gallery" | "timeline"
  setView: (v: "gallery" | "timeline") => void
  gallery: ReturnType<typeof useSnapshotsWindow>
  timeline: ReturnType<typeof useSnapshotsWindow>
}

export function DemoSection({
  allSnapshots,
  dataSource,
  setDataSource,
  selected,
  setSelected,
  viewerOpen,
  setViewerOpen,
  latestSnapshot,
  overallGrowthTrend,
  currentGrowthStage,
  overallGrowthPercent,
  avgConfidence,
  healthyCount,
  flaggedCount,
  avgTemp,
  dataSetStats,
  selectedIndex,
  previousSnapshot,
  effectiveSelected,
  effectiveIndex,
  effectivePrevious,
  handleSelect,
  view,
  setView,
  gallery,
  timeline,
}: DemoSectionProps) {
  const gTrend = GROWTH_STYLES[overallGrowthTrend]

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <Camera className="size-4 text-muted-foreground/40" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Snapshots</span>
            <span className="text-sm font-medium tabular-nums text-foreground/80">{allSnapshots.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <CircleCheck className="size-4 text-emerald-500/50" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Healthy</span>
            <span className="text-sm font-medium tabular-nums text-foreground/80">{healthyCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <AlertTriangle className="size-4 text-amber-500/50" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Flagged</span>
            <span className="text-sm font-medium tabular-nums text-foreground/80">{flaggedCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <Thermometer className="size-4 text-muted-foreground/40" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Avg Temp</span>
            <span className="text-sm font-medium tabular-nums text-foreground/80">{allSnapshots.length > 0 ? formatTemp(avgTemp) : "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <Gauge className="size-4 text-muted-foreground/40" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Avg Conf</span>
            <span className="text-sm font-medium tabular-nums text-foreground/80">{avgConfidence}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <Sprout className={cn("size-4", overallGrowthPercent !== null ? "text-emerald-500/50" : "text-muted-foreground/40")} />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Progress</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-medium tabular-nums text-foreground/80">
                {overallGrowthPercent !== null ? `${overallGrowthPercent}%` : "—"}
              </span>
              <span className={cn("text-[10px]", gTrend.color)}>{gTrend.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Assessment Card */}
      {latestSnapshot && <HeroAssessment snapshot={latestSnapshot} onClick={handleSelect} />}

      {/* Growth Journey — NEW */}
      <GrowthJourney currentStage={currentGrowthStage} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Gallery / Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                {view === "gallery" ? (<><Grid3X3 className="size-4 text-muted-foreground" />Snapshot Gallery</>) : (<><List className="size-4 text-muted-foreground" />Visual Timeline</>)}
                <span className="ml-auto text-[10px] font-normal text-muted-foreground/50">
                  {view === "gallery"
                    ? `${gallery.items.length} of ${gallery.total}`
                    : `${timeline.items.length} of ${timeline.total}`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {view === "gallery" ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gallery.items.map((snap, i) => (
                      <GalleryCard key={snap.id} snapshot={snap} index={i} onView={handleSelect} isSelected={effectiveSelected?.id === snap.id} />
                    ))}
                  </div>
                  {gallery.hasMore && (
                    <button type="button" onClick={gallery.loadMore} className="mt-4 w-full rounded-lg bg-muted/30 py-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                      Load more snapshots ({gallery.total - gallery.items.length} remaining)
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="divide-y divide-foreground/5">
                    {timeline.items.map((snap) => (
                      <TimelineRow key={snap.id} snapshot={snap} onView={handleSelect} />
                    ))}
                  </div>
                  {timeline.hasMore && (
                    <button type="button" onClick={timeline.loadMore} className="mt-4 w-full rounded-lg bg-muted/30 py-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                      Load more snapshots ({timeline.total - timeline.items.length} remaining)
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* AI Confidence Chart */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="size-4 text-muted-foreground" />
                AI Confidence Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConfidenceSparkline snapshots={allSnapshots} />
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar panels */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="size-4 text-muted-foreground" />
                Observation Panel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {effectiveSelected ? (
                <ObservationPanel snapshot={effectiveSelected} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Brain className="size-6 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground/50">No snapshots available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ScanEye className="size-4 text-muted-foreground" />
                Snapshot Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {effectiveSelected && effectivePrevious ? (
                <ComparisonCard current={effectiveSelected} previous={effectivePrevious} />
              ) : effectiveSelected ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <ScanEye className="size-6 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground/50">No previous capture available</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <ScanEye className="size-6 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground/50">No snapshots available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {effectiveSelected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Layers className="size-4 text-muted-foreground" />
                  Dataset Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2.5">
                    <span className="text-[10px] text-muted-foreground/50">Capture</span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {effectiveSelected.captureNumber} of {allSnapshots.length}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-700"
                      style={{ width: `${(effectiveSelected.captureNumber / allSnapshots.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground/40">
                    <span>First capture</span>
                    <span>Latest capture</span>
                  </div>
                  {effectiveSelected.growthStage && (
                    <div className="flex items-center justify-between pt-1 border-t border-foreground/5">
                      <span className="text-[10px] text-muted-foreground/50">Growth stage</span>
                      <span className={cn("text-[10px] font-medium", GROWTH_STAGE_LABELS[effectiveSelected.growthStage].color)}>
                        {GROWTH_STAGE_LABELS[effectiveSelected.growthStage].label}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Gauge className="size-4 text-muted-foreground" />
                Snapshot Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              {effectiveSelected ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">ID</span><span className="font-mono text-[10px] text-foreground/70">{effectiveSelected.id}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">Capture #</span><span className="font-mono text-[10px] text-foreground/70">{effectiveSelected.captureNumber} / {allSnapshots.length}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">Timestamp</span><span className="text-[10px] tabular-nums text-foreground/70">{effectiveSelected.timestamp}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">Temperature</span><span className="font-mono text-[10px] tabular-nums text-foreground/70">{formatTemp(effectiveSelected.temperature)}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">Humidity</span><span className="font-mono text-[10px] tabular-nums text-foreground/70">{formatHumidity(effectiveSelected.humidity)}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">CO₂</span><span className="font-mono text-[10px] tabular-nums text-foreground/70">{formatCO2(effectiveSelected.co2)}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">Analysis</span><span className={cn("text-[10px] font-medium", effectiveSelected.analysisSource === "mock-engine" ? "text-amber-500/70" : effectiveSelected.analysisSource === "human-review" ? "text-sky-500/70" : "text-violet-500/70")}>{effectiveSelected.analysisSource}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">Status</span><span className="text-[10px] text-foreground/70">{STATUS_STYLES[effectiveSelected.status].label}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">Confidence</span><span className="text-[10px] tabular-nums text-foreground/70">{effectiveSelected.confidence}%</span></div>
                  {effectiveSelected.growthStage && (
                    <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">Stage</span><span className={cn("text-[10px]", GROWTH_STAGE_LABELS[effectiveSelected.growthStage].color)}>{GROWTH_STAGE_LABELS[effectiveSelected.growthStage].label}</span></div>
                  )}
                  {effectiveSelected.differenceLevel && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground/50">Difference</span>
                      <span className={cn("text-[10px] font-medium", effectiveSelected.differenceLevel === "high" ? "text-amber-500" : effectiveSelected.differenceLevel === "medium" ? "text-sky-500" : "text-emerald-500")}>
                        {effectiveSelected.differenceLevel}
                      </span>
                    </div>
                  )}
                  {effectiveSelected.imageStats && (
                    <>
                      <div className="border-t border-foreground/5 pt-2 mt-1" />
                      <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">Format</span><span className="font-mono text-[10px] text-foreground/70">{effectiveSelected.imageStats.format ?? "—"}</span></div>
                      {effectiveSelected.imageStats.width && (
                        <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">Resolution</span><span className="font-mono text-[10px] text-foreground/70">{effectiveSelected.imageStats.width} × {effectiveSelected.imageStats.height}</span></div>
                      )}
                      {effectiveSelected.imageStats.fileSize && (
                        <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground/50">File Size</span><span className="font-mono text-[10px] text-foreground/70">{(effectiveSelected.imageStats.fileSize / 1024).toFixed(1)} KB</span></div>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground/50">Image</span>
                        <span className={cn("font-mono text-[10px]", effectiveSelected.imageUrl ? "text-emerald-500/70" : "text-muted-foreground/40")}>
                          {effectiveSelected.imageUrl?.split("/").pop() ?? "—"}
                        </span>
                      </div>
                    </>
                  )}
                  </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <Camera className="size-6 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground/50">No snapshots available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Recommendations — collapsible */}
      <AIRecommendationsPanel />

      {/* Upload Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Upload className="size-4 text-muted-foreground" />
            Capture Archive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VisualUpload />
        </CardContent>
      </Card>

      {/* Automation Readiness */}
      <AutomationReadiness />

      {/* Visual Analysis Sandbox */}
      {effectiveSelected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Microscope className="size-4 text-muted-foreground" />
              Visual Analysis Sandbox
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black/20">
                {effectiveSelected.imageUrl ? (
                  <Image
                    src={effectiveSelected.imageUrl}
                    fill
                    alt={`Analysis target: ${effectiveSelected.id}`}
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Microscope className="size-10 text-muted-foreground/10" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm">
                  {effectiveSelected.id}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
                    <CircleCheck className="size-4 text-emerald-500" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-emerald-500">Image Loaded</span>
                    <span className="text-[10px] text-emerald-500/50">{effectiveSelected.imageUrl}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-amber-500/10">
                    <Clock className="size-4 text-amber-500" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-amber-500">Analysis Pending</span>
                    <span className="text-[10px] text-amber-500/50">Awaiting AI engine integration</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-lg bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground/50">Source</span>
                    <span className="text-foreground/70 capitalize">{effectiveSelected.source}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground/50">Timestamp</span>
                    <span className="text-foreground/70 tabular-nums">{effectiveSelected.timestamp}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground/50">Growth Stage</span>
                    <span className="text-foreground/70">{effectiveSelected.growthStage ? GROWTH_STAGE_LABELS[effectiveSelected.growthStage].label : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground/50">Analysis Status</span>
                    <span className="text-amber-500/70">{effectiveSelected.analysisStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Viewer modal */}
      {viewerOpen && selected && selectedIndex >= 0 && (
        <SnapshotViewer
          snapshot={selected}
          previousSnapshot={previousSnapshot}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* Visual Dataset Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="size-4 text-muted-foreground" />
            Visual Dataset Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="flex flex-col gap-1 rounded-lg bg-muted/20 p-3">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Snapshots</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{dataSetStats.total}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-muted/20 p-3">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Date Range</span>
              <span className="text-[11px] font-medium tabular-nums text-foreground/70 leading-tight">
                {dataSetStats.firstTs?.split(" ")[0] ?? "—"}–{dataSetStats.lastTs?.split(" ")[0] ?? "—"}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-muted/20 p-3">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Avg Confidence</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{dataSetStats.avgConf}%</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-muted/20 p-3">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Growth Stage</span>
              <span className="text-sm font-semibold text-foreground">{dataSetStats.stage}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-muted/20 p-3">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Progress</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{dataSetStats.latestProgress}%</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-muted/20 p-3">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Days Tracked</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{dataSetStats.daysTracked}d</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-muted/20 p-3">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Dataset Health</span>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", confColor(dataSetStats.healthScore))} style={{ width: `${dataSetStats.healthScore}%` }} />
                </div>
                <span className="text-xs font-semibold tabular-nums text-foreground/70">{dataSetStats.healthScore}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
