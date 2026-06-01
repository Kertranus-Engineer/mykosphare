export type CaptureLifecycle = "uploaded" | "registered" | "processed" | "analyzed"

export const CAPTURE_LIFECYCLE_ORDER: CaptureLifecycle[] = [
  "uploaded",
  "registered",
  "processed",
  "analyzed",
]

export interface ProcessedCapture {
  id: string
  filename: string
  imageUrl: string
  bucketPath: string
  uploadedAt: string
  processedAt: string
  fileSize: number
  width: number | null
  height: number | null
  aspectRatio: number | null
  format: string
  hash: string
  source: "supabase" | "local" | "api"
  lifecycle: CaptureLifecycle
  isDuplicate: boolean
  duplicateOfId?: string
  metadata: CaptureMetadata
}

export interface CaptureMetadata {
  mimeType: string | null
  colorSpace: string | null
  hasAlpha: boolean | null
  bitDepth: number | null
}

export interface ProcessingResult {
  captures: ProcessedCapture[]
  duplicates: ProcessedCapture[]
  stats: {
    total: number
    processed: number
    duplicates: number
    failed: number
  }
}

export const LIFECYCLE_LABELS: Record<CaptureLifecycle, string> = {
  uploaded: "Uploaded",
  registered: "Registered",
  processed: "Processed",
  analyzed: "Analyzed",
}

export const LIFECYCLE_COLORS: Record<CaptureLifecycle, { text: string; bg: string; border: string }> = {
  uploaded:   { text: "text-cyan-500",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20" },
  registered: { text: "text-sky-500",    bg: "bg-sky-500/10",    border: "border-sky-500/20" },
  processed:  { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  analyzed:   { text: "text-violet-500",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
}
