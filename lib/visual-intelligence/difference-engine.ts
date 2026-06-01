export type DifferenceLevel = "low" | "medium" | "high"

export interface ImageMeta {
  imageUrl: string
  fileSize?: number
  width?: number
  height?: number
  format?: string
}

export interface DifferenceResult {
  level: DifferenceLevel
  score: number
  details: string[]
}

export function computeDifference(current: ImageMeta, previous: ImageMeta): DifferenceResult {
  const details: string[] = []
  let score = 0

  if (current.imageUrl !== previous.imageUrl) {
    score += 50
    details.push("Image source changed")
  }

  if (current.format && previous.format && current.format !== previous.format) {
    score += 10
    details.push(`Format changed: ${previous.format} → ${current.format}`)
  }

  if (current.fileSize && previous.fileSize) {
    const sizeChange = Math.abs(current.fileSize - previous.fileSize)
    const pctChange = previous.fileSize > 0 ? sizeChange / previous.fileSize : 0
    if (pctChange > 0.3) {
      score += 25
      details.push(`File size changed significantly (${Math.round(pctChange * 100)}%)`)
    } else if (pctChange > 0.1) {
      score += 10
      details.push(`File size changed moderately (${Math.round(pctChange * 100)}%)`)
    }
  }

  if (current.width && previous.width && current.height && previous.height) {
    if (current.width !== previous.width || current.height !== previous.height) {
      score += 15
      details.push(
        `Resolution changed: ${previous.width}×${previous.height} → ${current.width}×${current.height}`,
      )
    }
  }

  let level: DifferenceLevel = "low"
  if (score >= 40) level = "high"
  else if (score >= 15) level = "medium"

  return { level, score, details }
}
