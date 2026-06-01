import type { Observation } from "@/lib/observations/observation-engine"

export type TrendCategory =
  | "temperature"
  | "humidity"
  | "co2"
  | "capture"
  | "correlation"
  | "system"

export type TrendDirection =
  | "improving"
  | "stable"
  | "degrading"

export interface Trend {
  id: string
  title: string
  category: TrendCategory
  direction: TrendDirection
  confidence: number
  summary: string
  observationCount: number
  startTime: string
  endTime: string
}

const DIRECTION_COLORS = {
  improving: "text-emerald-500",
  stable: "text-sky-500",
  degrading: "text-amber-500",
} as const

const DIRECTION_BG = {
  improving: "bg-emerald-500/10 border-emerald-500/20",
  stable: "bg-sky-500/10 border-sky-500/20",
  degrading: "bg-amber-500/10 border-amber-500/20",
} as const

const DIRECTION_DOT = {
  improving: "bg-emerald-500",
  stable: "bg-sky-500",
  degrading: "bg-amber-500",
} as const

export { DIRECTION_COLORS, DIRECTION_BG, DIRECTION_DOT }

let trendCounter = 0

function nextTrendId(): string {
  return `trd-${Date.now().toString(36)}-${(trendCounter++).toString(36).padStart(4, "0")}`
}

function makeTrend(
  title: string,
  category: TrendCategory,
  direction: TrendDirection,
  confidence: number,
  summary: string,
  observationCount: number,
  startTime: string,
  endTime: string,
): Trend {
  return {
    id: nextTrendId(),
    title,
    category,
    direction,
    confidence,
    summary,
    observationCount,
    startTime,
    endTime,
  }
}

function countByCategory(
  observations: Observation[],
  category: string,
): { total: number; warning: number; critical: number } {
  const matching = observations.filter((o) =>
    o.sourceEvents.length > 0 &&
    o.title.toLowerCase().includes(category),
  )
  return {
    total: matching.length,
    warning: matching.filter((o) => o.severity === "warning").length,
    critical: matching.filter((o) => o.severity === "critical").length,
  }
}

function countWarningObservations(observations: Observation[]): number {
  return observations.filter(
    (o) => o.severity === "warning" || o.severity === "critical",
  ).length
}

function determineDirection(
  currentCount: number,
  previousCount: number,
): TrendDirection {
  if (currentCount > previousCount) return "degrading"
  if (currentCount < previousCount) return "improving"
  return "stable"
}

function computeConfidence(
  currentCount: number,
  previousCount: number,
  totalObservations: number,
): number {
  if (totalObservations === 0) return 100
  const delta = Math.abs(currentCount - previousCount)
  const ratio = Math.min(delta / Math.max(totalObservations, 1), 1)
  return Math.round(50 + ratio * 45)
}

function categoryLabel(category: TrendCategory): string {
  const labels: Record<TrendCategory, string> = {
    temperature: "Temperature",
    humidity: "Humidity",
    co2: "CO₂",
    capture: "Capture",
    correlation: "Correlation",
    system: "System",
  }
  return labels[category]
}

export interface TrendGenerationResult {
  trends: Trend[]
  stats: {
    total: number
    improving: number
    stable: number
    degrading: number
  }
}

const TRACKED_CATEGORIES: TrendCategory[] = [
  "humidity",
  "temperature",
  "capture",
  "correlation",
]

export function generateTrends(
  currentObservations: Observation[],
  previousObservations: Observation[],
): TrendGenerationResult {
  trendCounter = 0

  const trends: Trend[] = []
  const now = new Date().toISOString()
  const currentWarningCount = countWarningObservations(currentObservations)
  const previousWarningCount = countWarningObservations(previousObservations)

  if (currentWarningCount === 0 && previousWarningCount === 0) {
    trends.push(
      makeTrend(
        "Environment Stable",
        "system",
        "stable",
        100,
        "No warning-level observations have been recorded across the current and previous monitoring windows. All parameters remain within expected thresholds.",
        0,
        now,
        now,
      ),
    )
  } else {
    for (const category of TRACKED_CATEGORIES) {
      const current = countByCategory(currentObservations, category)
      const previous = countByCategory(previousObservations, category)
      const totalObs = current.total + previous.total

      if (current.total === 0 && previous.total === 0) continue

      const direction = determineDirection(current.total, previous.total)
      const confidence = computeConfidence(current.total, previous.total, totalObs)
      const label = categoryLabel(category)

      let title: string
      let summary: string

      if (direction === "degrading") {
        title = `${label} Conditions Degrading`
        summary = `${label} observations have increased from ${previous.total} to ${current.total} in the recent window. This suggests a sustained trend that requires attention.`
      } else if (direction === "improving") {
        title = `${label} Conditions Improving`
        summary = `${label} observations have decreased from ${previous.total} to ${current.total}. The environment appears to be stabilizing in this dimension.`
      } else {
        if (current.total > 0) {
          title = `${label} Trend Persistent`
          summary = `${label} observations remain at ${current.total} with no significant change from the previous window (${previous.total}). The condition has not resolved.`
        } else {
          title = `${label} Trend Resolved`
          summary = `${label} observations have cleared. Previous window had ${previous.total} observations; none are present now.`
        }
      }

      trends.push(
        makeTrend(
          title,
          category,
          direction,
          confidence,
          summary,
          current.total + previous.total,
          now,
          now,
        ),
      )
    }

    const hasDegrading = trends.some((t) => t.direction === "degrading")
    const hasImproving = trends.some((t) => t.direction === "improving")
    const allStable = trends.every((t) => t.direction === "stable")

    if (hasDegrading) {
      const degradingCategories = trends
        .filter((t) => t.direction === "degrading")
        .map((t) => categoryLabel(t.category))
        .join(", ")
      trends.push(
        makeTrend(
          "Environmental Memory: Conditions Shifting",
          "system",
          "degrading",
          85,
          `Multiple environmental dimensions are showing degradation: ${degradingCategories}. This pattern suggests systemic drift rather than isolated incidents.`,
          currentWarningCount + previousWarningCount,
          now,
          now,
        ))
    } else if (hasImproving && !hasDegrading) {
      trends.push(
        makeTrend(
          "Environmental Memory: Recovery in Progress",
          "system",
          "improving",
          80,
          "Previously flagged dimensions are showing improvement. The environment is trending toward nominal conditions.",
          currentWarningCount + previousWarningCount,
          now,
          now,
        ))
    } else if (allStable && trends.length > 0) {
      trends.push(
        makeTrend(
          "Environmental Memory: Pattern Established",
          "system",
          "stable",
          70,
          "Current observation patterns are consistent with the previous window. No significant shifts detected.",
          currentWarningCount + previousWarningCount,
          now,
          now,
        ))
    }
  }

  const stats = {
    total: trends.length,
    improving: trends.filter((t) => t.direction === "improving").length,
    stable: trends.filter((t) => t.direction === "stable").length,
    degrading: trends.filter((t) => t.direction === "degrading").length,
  }

  return { trends, stats }
}

export function getTrendsForCapture(
  trends: Trend[],
  captureObservations: Observation[],
): Trend[] {
  const involvedCategories = new Set<TrendCategory>()

  for (const obs of captureObservations) {
    if (obs.title.toLowerCase().includes("humidity")) involvedCategories.add("humidity")
    if (obs.title.toLowerCase().includes("temperature")) involvedCategories.add("temperature")
    if (obs.title.toLowerCase().includes("capture") || obs.title.toLowerCase().includes("visual") || obs.title.toLowerCase().includes("monitoring")) involvedCategories.add("capture")
    if (obs.title.toLowerCase().includes("correlation") || obs.title.toLowerCase().includes("telemetry")) involvedCategories.add("correlation")
  }

  if (involvedCategories.size === 0) return []

  return trends.filter((t) => involvedCategories.has(t.category))
}
