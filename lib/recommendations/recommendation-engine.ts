import type { Trend, TrendCategory } from "@/lib/trends/trend-engine"

export type RecommendationPriority = "low" | "medium" | "high"

export interface Recommendation {
  id: string
  timestamp: string
  priority: RecommendationPriority
  title: string
  description: string
  sourceTrendId: string
  category: TrendCategory
}

const PRIORITY_COLORS = {
  low: "text-sky-500",
  medium: "text-amber-500",
  high: "text-red-500",
} as const

const PRIORITY_BG = {
  low: "bg-sky-500/10 border-sky-500/20",
  medium: "bg-amber-500/10 border-amber-500/20",
  high: "bg-red-500/10 border-red-500/20",
} as const

const PRIORITY_DOT = {
  low: "bg-sky-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
} as const

export { PRIORITY_COLORS, PRIORITY_BG, PRIORITY_DOT }

let recommendationCounter = 0

function nextRecommendationId(): string {
  return `rec-${Date.now().toString(36)}-${(recommendationCounter++).toString(36).padStart(4, "0")}`
}

function priorityFromDirection(direction: string): RecommendationPriority {
  if (direction === "degrading") return "high"
  if (direction === "stable") return "medium"
  return "low"
}

function makeRecommendation(
  trend: Trend,
  title: string,
  description: string,
  priorityOverride?: RecommendationPriority,
): Recommendation {
  return {
    id: nextRecommendationId(),
    timestamp: new Date().toISOString(),
    priority: priorityOverride ?? priorityFromDirection(trend.direction),
    title,
    description,
    sourceTrendId: trend.id,
    category: trend.category,
  }
}

interface CategoryRule {
  match: (trend: Trend) => boolean
  title: string
  description: string
}

const CATEGORY_RULES: Record<string, CategoryRule> = {
  humidity_degrading: {
    match: (t) => t.category === "humidity" && t.direction === "degrading",
    title: "Increase Ventilation Frequency",
    description: "Humidity levels are trending upward. Increase ventilation cycles and verify that exhaust fans are operating at full capacity. Consider adjusting the target humidity threshold temporarily.",
  },
  temperature_degrading: {
    match: (t) => t.category === "temperature" && t.direction === "degrading",
    title: "Inspect Heat Sources",
    description: "Temperature is on an upward trajectory. Inspect nearby heat sources, verify that cooling equipment is functional, and check for any insulation gaps in the enclosure.",
  },
  capture_degrading: {
    match: (t) => t.category === "capture" && t.direction === "degrading",
    title: "Check Smartphone Capture System",
    description: "Capture reliability is decreasing. Verify that the smartphone is connected to power, the camera lens is unobstructed, and the upload automation is running on schedule.",
  },
  correlation_degrading: {
    match: (t) => t.category === "correlation" && t.direction === "degrading",
    title: "Verify Telemetry Synchronization",
    description: "Telemetry correlation is degrading. Check that the ESP32 sensor module is online and transmitting data. Verify that device clocks are synchronized and sampling intervals are consistent.",
  },
  humidity_stable: {
    match: (t) => t.category === "humidity" && t.direction === "stable",
    title: "Continue Humidity Monitoring",
    description: "Humidity levels are stable. Maintain the current ventilation schedule and continue monitoring for any shifts in the trend.",
  },
  temperature_stable: {
    match: (t) => t.category === "temperature" && t.direction === "stable",
    title: "Maintain Temperature Controls",
    description: "Temperature is stable at current levels. No immediate adjustments are required. Continue regular monitoring.",
  },
  capture_stable: {
    match: (t) => t.category === "capture" && t.direction === "stable",
    title: "Keep Capture Schedule",
    description: "Capture pipeline is operating steadily. Maintain the current upload interval and verify storage capacity periodically.",
  },
  correlation_stable: {
    match: (t) => t.category === "correlation" && t.direction === "stable",
    title: "Sustain Telemetry Alignment",
    description: "Telemetry correlation is holding steady. Continue with the current synchronization configuration.",
  },
}

export interface RecommendationGenerationResult {
  recommendations: Recommendation[]
  stats: {
    total: number
    low: number
    medium: number
    high: number
  }
}

export function generateRecommendations(trends: Trend[]): RecommendationGenerationResult {
  recommendationCounter = 0

  const recommendations: Recommendation[] = []

  for (const trend of trends) {
    const ruleKey = `${trend.category}_${trend.direction}`
    const rule = CATEGORY_RULES[ruleKey]

    if (rule && rule.match(trend)) {
      recommendations.push(
        makeRecommendation(trend, rule.title, rule.description),
      )
    }
  }

  if (recommendations.length === 0) {
    const noIssueTrend = trends.find((t) => t.title === "Environment Stable")
    const sourceId = noIssueTrend?.id ?? ""
    recommendations.push({
      id: nextRecommendationId(),
      timestamp: new Date().toISOString(),
      priority: "low",
      title: "Maintain Current Operating Conditions",
      description: "No significant issues have been detected across any environmental dimension. Continue with the established monitoring and maintenance schedule.",
      sourceTrendId: sourceId,
      category: "system",
    })
  }

  recommendations.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  const stats = {
    total: recommendations.length,
    low: recommendations.filter((r) => r.priority === "low").length,
    medium: recommendations.filter((r) => r.priority === "medium").length,
    high: recommendations.filter((r) => r.priority === "high").length,
  }

  return { recommendations, stats }
}

export function getRecommendationsForCapture(
  recommendations: Recommendation[],
  trends: Trend[],
  captureTrends: Trend[],
): Recommendation[] {
  const captureTrendIds = new Set(captureTrends.map((t) => t.id))

  return recommendations.filter((r) =>
    r.sourceTrendId === "" || captureTrendIds.has(r.sourceTrendId),
  )
}
