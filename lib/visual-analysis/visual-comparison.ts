import type { ProcessedCapture } from "@/lib/capture-processing/types"

export interface VisualComparison {
  imageA: string
  imageB: string
  similarity: number
  difference: number
  elapsedTimeHours: number
}

function dimensionSimilarity(a: ProcessedCapture, b: ProcessedCapture): number {
  if (a.width == null || a.height == null || b.width == null || b.height == null) return 0.5
  if (a.width === b.width && a.height === b.height) return 1.0
  const wRatio = Math.min(a.width, b.width) / Math.max(a.width, b.width)
  const hRatio = Math.min(a.height, b.height) / Math.max(a.height, b.height)
  return wRatio * hRatio
}

function fileSizeSimilarity(a: ProcessedCapture, b: ProcessedCapture): number {
  if (a.fileSize <= 0 || b.fileSize <= 0) return 0.5
  const diff = Math.abs(a.fileSize - b.fileSize)
  const max = Math.max(a.fileSize, b.fileSize)
  return 1 - diff / max
}

function timeProximity(a: ProcessedCapture, b: ProcessedCapture): number {
  const timeA = new Date(a.uploadedAt).getTime()
  const timeB = new Date(b.uploadedAt).getTime()
  if (isNaN(timeA) || isNaN(timeB)) return 0.5
  const hoursDiff = Math.abs(timeB - timeA) / (1000 * 60 * 60)
  return Math.exp(-hoursDiff / 24)
}

export function compareImages(
  captureA: ProcessedCapture,
  captureB: ProcessedCapture,
): VisualComparison {
  const dimSim = dimensionSimilarity(captureA, captureB)
  const sizeSim = fileSizeSimilarity(captureA, captureB)
  const timeSim = timeProximity(captureA, captureB)

  const similarity = Math.round((dimSim * 0.3 + sizeSim * 0.3 + timeSim * 0.4) * 100)
  const difference = 100 - similarity

  const timeA = new Date(captureA.uploadedAt).getTime()
  const timeB = new Date(captureB.uploadedAt).getTime()
  const elapsedHours = Math.round((Math.abs(timeB - timeA) / (1000 * 60 * 60)) * 10) / 10

  return {
    imageA: captureA.id,
    imageB: captureB.id,
    similarity,
    difference,
    elapsedTimeHours: elapsedHours,
  }
}

export function compareAllCaptures(captures: ProcessedCapture[]): VisualComparison[] {
  if (captures.length < 2) return []

  const sorted = [...captures].sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
  )

  const comparisons: VisualComparison[] = []
  for (let i = 1; i < sorted.length; i++) {
    comparisons.push(compareImages(sorted[i - 1], sorted[i]))
  }

  return comparisons
}

export interface VisualComparisonStats {
  totalComparisons: number
  avgSimilarity: number
  avgDifference: number
  maxDifference: number
  minDifference: number
  avgElapsedHours: number
}

export function computeComparisonStats(comparisons: VisualComparison[]): VisualComparisonStats {
  if (comparisons.length === 0) {
    return {
      totalComparisons: 0,
      avgSimilarity: 0,
      avgDifference: 0,
      maxDifference: 0,
      minDifference: 0,
      avgElapsedHours: 0,
    }
  }

  const similarities = comparisons.map((c) => c.similarity)
  const differences = comparisons.map((c) => c.difference)
  const elapsed = comparisons.map((c) => c.elapsedTimeHours)

  return {
    totalComparisons: comparisons.length,
    avgSimilarity: Math.round(similarities.reduce((a, v) => a + v, 0) / comparisons.length),
    avgDifference: Math.round(differences.reduce((a, v) => a + v, 0) / comparisons.length),
    maxDifference: Math.max(...differences),
    minDifference: Math.min(...differences),
    avgElapsedHours: Math.round((elapsed.reduce((a, v) => a + v, 0) / comparisons.length) * 10) / 10,
  }
}
