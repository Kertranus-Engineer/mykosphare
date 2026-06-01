"use client"

import { useState, useMemo } from "react"
import {
  Camera,
  Clock,
  CircleCheck,
  Gauge,
  AlertTriangle,
  Activity,
  Microscope,
  Calendar,
  RefreshCw,
  HardDrive,
  Image as ImageIcon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { useLiveSnapshots } from "@/features/live/live-snapshots"
import { useCaptureProcessor } from "@/features/capture-processing/use-capture-processor"
import { useCorrelation, getCorrelationForCapture } from "@/features/correlation/use-correlation"
import { TelemetryCorrelationCard } from "@/features/correlation/components/telemetry-correlation-card"
import { useEvents } from "@/features/events/use-events"
import { EventStatistics } from "@/features/events/components/event-statistics"
import { EventFeed } from "@/features/events/components/event-feed"
import { RecentEvents } from "@/features/events/components/recent-events"
import { useObservations } from "@/features/observations/use-observations"
import { ObservationStatistics } from "@/features/observations/components/observation-statistics"
import { ObservationFeed } from "@/features/observations/components/observation-feed"
import { LatestObservationCard } from "@/features/observations/components/latest-observation-card"
import { useTrends } from "@/features/trends/use-trends"
import { TrendStatistics } from "@/features/trends/components/trend-statistics"
import { TrendFeed } from "@/features/trends/components/trend-feed"
import { LatestTrendCard } from "@/features/trends/components/latest-trend-card"
import { useRecommendations } from "@/features/recommendations/use-recommendations"
import { RecommendationStatistics } from "@/features/recommendations/components/recommendation-statistics"
import { RecommendationFeed } from "@/features/recommendations/components/recommendation-feed"
import { LatestRecommendationCard } from "@/features/recommendations/components/latest-recommendation-card"
import { useActionProposals } from "@/features/actions/use-action-proposals"
import { ActionProposalCard } from "@/features/actions/components/action-proposal-card"
import { SuggestedChangesPanel } from "@/features/actions/components/suggested-changes-panel"
import { useValidation } from "@/features/validation/use-validation"
import { ValidationStatistics } from "@/features/validation/components/validation-statistics"
import { ValidationFeed } from "@/features/validation/components/validation-feed"
import { PipelineValidation } from "@/features/validation/components/pipeline-validation"
import { useVisualComparison } from "@/features/visual-analysis/use-visual-comparison"
import { VisualComparisonCard } from "@/features/visual-analysis/components/visual-comparison-card"
import { ComparisonHistory } from "@/features/visual-analysis/components/comparison-history"
import { VisualProgressTimeline } from "@/features/visual-analysis/components/visual-progress-timeline"
import { useKnowledge } from "@/features/knowledge/use-knowledge"
import { KnowledgeControls } from "@/features/knowledge/components/knowledge-controls"
import { KnowledgeStatistics } from "@/features/knowledge/components/knowledge-statistics"
import { KnowledgeFeed } from "@/features/knowledge/components/knowledge-feed"
import { useCultivationProfile } from "@/features/twin/use-cultivation-profile"
import { CultivationSummaryCard } from "@/features/twin/components/cultivation-summary-card"
import { TwinHealthScoreCard } from "@/features/twin/components/twin-health-score"
import { ProfileSelector } from "@/features/twin/components/profile-selector"
import { computeTwinHealthScore } from "@/lib/twin/cultivation-profile"
import { ProcessingStatus } from "@/features/capture-processing/components/processing-status"
import { CaptureFeed } from "@/features/capture-processing/components/capture-feed"
import { CaptureInspector } from "@/features/capture-processing/components/capture-inspector"

export function LiveSnapshotsSection() {
  const { images, stats, loading: snapLoading, error: snapError, refresh } = useLiveSnapshots()
  const { captures, duplicates, stats: procStats, loading: procLoading, error: procError, reprocess } = useCaptureProcessor(images)
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  const selectedCapture = useMemo(
    () => [...captures, ...duplicates].find((c) => c.id === selectedId) ?? null,
    [captures, duplicates, selectedId],
  )

  const { results: correlatedResults, stats: corrStats, loading: corrLoading } = useCorrelation(captures)
  const selectedCorrelated = useMemo(
    () => selectedId ? getCorrelationForCapture(correlatedResults, selectedId) : null,
    [correlatedResults, selectedId],
  )

  const { events: allEvents, stats: eventStats } = useEvents(captures, correlatedResults)
  const captureEvents = useMemo(
    () => selectedId ? allEvents.filter((e) => e.captureId === selectedId) : [],
    [allEvents, selectedId],
  )

  const { observations: allObservations, stats: observationStats, getForCapture: getObservationsForCapture } = useObservations(allEvents)
  const captureObservations = useMemo(
    () => selectedId ? getObservationsForCapture(selectedId) : [],
    [getObservationsForCapture, selectedId],
  )

  const { trends: allTrends, stats: trendStats, getForCapture: getTrendsForCapture } = useTrends(allObservations)
  const captureTrends = useMemo(
    () => selectedId ? getTrendsForCapture(captureObservations) : [],
    [getTrendsForCapture, captureObservations, selectedId],
  )

  const { recommendations: allRecommendations, stats: recommendationStats, getForCapture: getRecommendationsForCapture } = useRecommendations(allTrends)
  const captureRecommendations = useMemo(
    () => selectedId ? getRecommendationsForCapture(captureTrends) : [],
    [getRecommendationsForCapture, captureTrends, selectedId],
  )

  const { proposals: allProposals, getForCapture: getProposalsForCapture } = useActionProposals(allRecommendations)
  const captureProposals = useMemo(
    () => selectedId ? getProposalsForCapture(captureRecommendations) : [],
    [getProposalsForCapture, captureRecommendations, selectedId],
  )

  const validation = useValidation()
  const latestObservation = allObservations.length > 0 ? allObservations[0] : null
  const latestTrend = allTrends.length > 0 ? allTrends[0] : null
  const latestRecommendation = allRecommendations.length > 0 ? allRecommendations[0] : null

  const { comparisons: allComparisons, stats: comparisonStats } = useVisualComparison(captures)
  const latestComparison = allComparisons.length > 0 ? allComparisons[allComparisons.length - 1] : null

  const knowledge = useKnowledge({
    events: allEvents,
    observations: allObservations,
    trends: allTrends,
    recommendations: allRecommendations,
    proposals: allProposals,
    validations: validation.records,
  })

  const cultivation = useCultivationProfile()

  const twinHealth = useMemo(() => {
    const expectedCaptures = captures.length > 0
      ? Math.max(captures.length, 1)
      : 0

    return computeTwinHealthScore({
      hasTelemetry: allEvents.some((e) => e.category === "temperature" || e.category === "humidity"),
      hasCaptures: captures.length > 0,
      totalCaptures: captures.length,
      expectedCaptures,
      correlationScore: corrStats.total > 0 ? corrStats.avgScore : 0,
      confirmedValidations: validation.stats.confirmed,
      rejectedValidations: validation.stats.rejected,
    })
  }, [allEvents, captures, corrStats, validation.stats])

  if (snapLoading || procLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <RefreshCw className="size-6 text-muted-foreground/40 animate-spin" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-muted-foreground/50">Processing captures...</p>
            <p className="text-xs text-muted-foreground/30">Loading from Supabase bucket and computing metadata</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (snapError || procError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
          <AlertTriangle className="size-6 text-amber-500/60" />
          <p className="text-xs text-amber-500/70">{snapError || procError}</p>
          <button type="button" onClick={refresh} className="rounded-md bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Camera className="size-8 text-muted-foreground/20" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-muted-foreground/50">No snapshots available</p>
            <p className="text-xs text-muted-foreground/30">Upload images to the Supabase &quot;snapshots&quot; bucket to begin live monitoring</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Digital Twin Header */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CultivationSummaryCard profile={cultivation.activeProfile} />
        </div>
        <div className="lg:col-span-1">
          <TwinHealthScoreCard health={twinHealth} />
        </div>
        <div className="lg:col-span-1">
          <ProfileSelector
            profiles={cultivation.profiles}
            activeProfile={cultivation.activeProfile}
            onSelect={cultivation.setActiveProfile}
            onAdd={() => cultivation.addProfile({
              name: "New Cultivation",
              species: "Pleurotus ostreatus",
              inoculationDate: new Date().toISOString().slice(0, 10),
            })}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <Camera className="size-4 text-emerald-500/50" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Total Images</span>
            <span className="text-sm font-medium tabular-nums text-foreground/80">{stats.totalImages}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <HardDrive className="size-4 text-violet-500/50" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Storage</span>
            <span className="text-sm font-medium tabular-nums text-foreground/80">{stats.storageUsedBytes > 0 ? `${(stats.storageUsedBytes / 1024).toFixed(1)} KB` : "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <Clock className="size-4 text-cyan-500/50" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Avg Interval</span>
            <span className="text-sm font-medium tabular-nums text-foreground/80">{stats.avgCaptureInterval > 0 ? `${Math.round(stats.avgCaptureInterval)}h` : "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <Calendar className="size-4 text-emerald-500/50" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">First</span>
            <span className="text-[10px] font-medium tabular-nums text-foreground/80">
              {stats.firstCapture ? new Date(stats.firstCapture).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <Calendar className="size-4 text-amber-500/50" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Latest</span>
            <span className="text-[10px] font-medium tabular-nums text-foreground/80">
              {stats.latestCapture ? new Date(stats.latestCapture).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <ImageIcon className="size-4 text-sky-500/50" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Bucket</span>
            <span className="text-sm font-medium text-sky-500/80">snapshots</span>
          </div>
        </div>
      </div>

      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-px w-6 bg-gradient-to-r from-transparent to-emerald-500/20" />
          <span className="text-[9px] font-mono font-medium tracking-[0.2em] text-emerald-500/60 uppercase">Capture Processing</span>
          <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
        </div>
        <button type="button" onClick={reprocess} className="flex items-center gap-1 rounded-md border border-border/20 px-2 py-1 text-[9px] font-medium text-muted-foreground/50 hover:text-foreground hover:bg-muted/20 transition-colors">
          <RefreshCw className="size-2.5" />Reprocess All
        </button>
      </div>

      {/* Processing Status */}
      <ProcessingStatus
        currentLifecycle={procStats.processed > 0 ? "processed" : "uploaded"}
        stats={procStats}
        loading={false}
      />

      {/* Correlation Stats Summary */}
      {!corrLoading && corrStats.total > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2">
            <CircleCheck className="size-3.5 text-emerald-500/60" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground/50">Correlated</span>
              <span className="text-xs font-bold tabular-nums text-emerald-500">{corrStats.correlated}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-2">
            <AlertTriangle className="size-3.5 text-amber-500/60" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground/50">Unmatched</span>
              <span className="text-xs font-bold tabular-nums text-amber-500">{corrStats.unmatched}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-sky-500/10 bg-sky-500/5 px-3 py-2">
            <Gauge className="size-3.5 text-sky-500/60" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground/50">Avg Score</span>
              <span className="text-xs font-bold tabular-nums text-sky-500">{corrStats.avgScore}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-violet-500/10 bg-violet-500/5 px-3 py-2">
            <Clock className="size-3.5 text-violet-500/60" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground/50">Avg Offset</span>
              <span className="text-xs font-bold tabular-nums text-violet-500">{corrStats.avgOffset}s</span>
            </div>
          </div>
        </div>
      )}

      {/* Event Statistics */}
      <EventStatistics
        info={eventStats.info}
        warning={eventStats.warning}
        critical={eventStats.critical}
        total={eventStats.total}
      />

      {/* Observation Statistics */}
      <ObservationStatistics
        info={observationStats.info}
        warning={observationStats.warning}
        critical={observationStats.critical}
        total={observationStats.total}
      />

      {/* Latest Observation Card */}
      <LatestObservationCard
        observation={allObservations.length > 0 ? allObservations[0] : null}
      />

      {/* Trend Statistics */}
      <TrendStatistics
        improving={trendStats.improving}
        stable={trendStats.stable}
        degrading={trendStats.degrading}
        total={trendStats.total}
      />

      {/* Latest Trend Card */}
      <LatestTrendCard
        trend={allTrends.length > 0 ? allTrends[0] : null}
      />

      {/* Recommendation Statistics */}
      <RecommendationStatistics
        low={recommendationStats.low}
        medium={recommendationStats.medium}
        high={recommendationStats.high}
        total={recommendationStats.total}
      />

      {/* Latest Recommendation Card */}
      <LatestRecommendationCard
        recommendation={allRecommendations.length > 0 ? allRecommendations[0] : null}
      />

      {/* Latest Action Proposal */}
      {allProposals.length > 0 && (
        <ActionProposalCard proposal={allProposals[0]} />
      )}

      {/* Pipeline Validation */}
      <PipelineValidation
        observation={latestObservation}
        trend={latestTrend}
        recommendation={latestRecommendation}
        getObservationStatus={validation.getStatus}
        getTrendStatus={validation.getStatus}
        getRecommendationStatus={validation.getStatus}
        onConfirmObservation={validation.confirmObservation}
        onRejectObservation={validation.rejectObservation}
        onConfirmTrend={validation.confirmTrend}
        onRejectTrend={validation.rejectTrend}
        onConfirmRecommendation={validation.confirmRecommendation}
        onRejectRecommendation={validation.rejectRecommendation}
      />

      {/* Validation Statistics */}
      <ValidationStatistics
        confirmed={validation.stats.confirmed}
        rejected={validation.stats.rejected}
        pending={validation.stats.pending}
        total={validation.stats.total}
      />

      {/* Two-column layout: Feed + Inspector */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CaptureFeed
            captures={captures}
            duplicates={duplicates}
            onSelect={(c) => setSelectedId(c.id)}
            selectedId={selectedId}
          />
        </div>
        <div className="flex flex-col gap-4">
          {selectedCapture ? (
            <>
              <CaptureInspector
                capture={selectedCapture}
                onClose={() => setSelectedId(undefined)}
              />
              <TelemetryCorrelationCard correlated={selectedCorrelated} />
              {captureEvents.length > 0 && (
                <EventFeed
                  events={captureEvents}
                  emptyMessage="No events associated with this capture"
                />
              )}
              {captureObservations.length > 0 && (
                <ObservationFeed
                  observations={captureObservations}
                  emptyMessage="No observations associated with this capture"
                />
              )}
              {captureTrends.length > 0 && (
                <TrendFeed
                  trends={captureTrends}
                  emptyMessage="No trends associated with this capture"
                />
              )}
              {captureRecommendations.length > 0 && (
                <RecommendationFeed
                  recommendations={captureRecommendations}
                  emptyMessage="No recommendations associated with this capture"
                />
              )}
              {captureProposals.length > 0 && (
                <SuggestedChangesPanel
                  proposals={captureProposals}
                  emptyMessage="No action proposals associated with this capture"
                />
              )}
            </>
          ) : (
            <>
              <RecentEvents events={allEvents} />
              <ObservationFeed observations={allObservations} />
              <TrendFeed trends={allTrends} />
              <RecommendationFeed recommendations={allRecommendations} />
              <SuggestedChangesPanel proposals={allProposals} />
              <ValidationFeed records={validation.records} />
            </>
          )}
        </div>
      </div>

      {/* Visual Analysis Sandbox */}
      <div className="flex flex-col gap-4">
        {latestComparison && (
          <VisualComparisonCard
            comparison={latestComparison}
            captureA={captures.find((c) => c.id === latestComparison.imageA)}
            captureB={captures.find((c) => c.id === latestComparison.imageB)}
          />
        )}

        {comparisonStats.totalComparisons > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2">
              <Activity className="size-3.5 text-emerald-500/60" />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground/50">Avg Similarity</span>
                <span className="text-xs font-bold tabular-nums text-emerald-500">{comparisonStats.avgSimilarity}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-2">
              <Gauge className="size-3.5 text-amber-500/60" />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground/50">Avg Difference</span>
                <span className="text-xs font-bold tabular-nums text-amber-500">{comparisonStats.avgDifference}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-sky-500/10 bg-sky-500/5 px-3 py-2">
              <Clock className="size-3.5 text-sky-500/60" />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground/50">Avg Interval</span>
                <span className="text-xs font-bold tabular-nums text-sky-500">{comparisonStats.avgElapsedHours}h</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-violet-500/10 bg-violet-500/5 px-3 py-2">
              <Microscope className="size-3.5 text-violet-500/60" />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground/50">Comparisons</span>
                <span className="text-xs font-bold tabular-nums text-violet-500">{comparisonStats.totalComparisons}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <VisualProgressTimeline
            comparisons={allComparisons}
            captures={captures}
          />
          <ComparisonHistory
            comparisons={allComparisons}
            captures={captures}
          />
        </div>
      </div>

      {/* Knowledge Layer */}
      <div className="flex flex-col gap-4">
        <KnowledgeControls
          onArchive={knowledge.archive}
          onExport={knowledge.exportJSON}
          onImport={knowledge.importJSON}
          onClear={knowledge.clear}
          archiveCount={knowledge.archiveCount}
          recordCount={knowledge.records.length}
        />

        <KnowledgeStatistics stats={knowledge.stats} />

        <KnowledgeFeed records={knowledge.records} />
      </div>
    </>
  )
}
