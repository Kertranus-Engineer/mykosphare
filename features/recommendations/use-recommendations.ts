"use client"

import { useMemo } from "react"
import type { Trend } from "@/lib/trends/trend-engine"
import {
  generateRecommendations,
  getRecommendationsForCapture,
  type Recommendation,
  type RecommendationGenerationResult,
} from "@/lib/recommendations/recommendation-engine"

interface UseRecommendationsResult {
  recommendations: Recommendation[]
  stats: RecommendationGenerationResult["stats"]
  getForCapture: (captureTrends: Trend[]) => Recommendation[]
}

export function useRecommendations(trends: Trend[]): UseRecommendationsResult {
  const safeTrends = trends ?? []
  const result = useMemo(() => {
    if (safeTrends.length === 0) return { recommendations: [], stats: { total: 0, low: 0, medium: 0, high: 0 } }
    return generateRecommendations(safeTrends)
  }, [safeTrends])

  return {
    recommendations: result.recommendations,
    stats: result.stats,
    getForCapture: (captureTrends: Trend[]) =>
      getRecommendationsForCapture(result.recommendations, safeTrends, captureTrends),
  }
}
