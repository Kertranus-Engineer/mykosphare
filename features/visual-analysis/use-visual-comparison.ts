"use client"

import { useMemo } from "react"
import type { ProcessedCapture } from "@/lib/capture-processing/types"
import {
  compareAllCaptures,
  computeComparisonStats,
  type VisualComparison,
  type VisualComparisonStats,
} from "@/lib/visual-analysis/visual-comparison"

interface UseVisualComparisonResult {
  comparisons: VisualComparison[]
  stats: VisualComparisonStats
  findComparison: (captureId: string) => VisualComparison | null
}

export function useVisualComparison(captures: ProcessedCapture[]): UseVisualComparisonResult {
  const comparisons = useMemo(() => compareAllCaptures(captures), [captures])
  const stats = useMemo(() => computeComparisonStats(comparisons), [comparisons])

  const findComparison = useMemo(
    () => (captureId: string) => {
      return comparisons.find(
        (c) => c.imageA === captureId || c.imageB === captureId,
      ) ?? null
    },
    [comparisons],
  )

  return { comparisons, stats, findComparison }
}
