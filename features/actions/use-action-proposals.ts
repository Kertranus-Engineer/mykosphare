"use client"

import { useMemo } from "react"
import type { Recommendation } from "@/lib/recommendations/recommendation-engine"
import {
  generateActionProposals,
  getActionProposalsForCapture,
  type ActionProposal,
} from "@/lib/actions/action-proposal-engine"

interface UseActionProposalsResult {
  proposals: ActionProposal[]
  getForCapture: (captureRecommendations: Recommendation[]) => ActionProposal[]
}

export function useActionProposals(recommendations: Recommendation[]): UseActionProposalsResult {
  const safeRecommendations = recommendations ?? []
  const result = useMemo(() => {
    if (safeRecommendations.length === 0) return { proposals: [] }
    return generateActionProposals(safeRecommendations)
  }, [safeRecommendations])

  return {
    proposals: result.proposals,
    getForCapture: (captureRecommendations: Recommendation[]) =>
      getActionProposalsForCapture(result.proposals, captureRecommendations),
  }
}
