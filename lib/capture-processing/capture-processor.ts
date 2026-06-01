import type { ProcessedCapture, CaptureLifecycle, ProcessingResult } from "./types"
import type { SupabaseImage } from "@/features/live/live-snapshots"

let idCounter = 0

function generateCaptureId(filename: string, index: number): string {
  const ts = Date.now().toString(36)
  const seq = (idCounter++).toString(36).padStart(4, "0")
  const safe = filename.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 24)
  return `cap-${ts}-${seq}-${safe}`
}

function extractFormat(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  return ext.toUpperCase()
}

function computeAspectRatio(width: number | null, height: number | null): number | null {
  if (width == null || height == null || height === 0) return null
  return Math.round((width / height) * 100) / 100
}

async function fetchImageBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { mode: "cors" })
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

async function computeSHA256(url: string): Promise<string> {
  try {
    const bytes = await fetchImageBytes(url)
    if (!bytes) return fallbackHash(url)

    const digest = await crypto.subtle.digest("SHA-256", bytes)
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    return hex
  } catch {
    return fallbackHash(url)
  }
}

async function computeSHA256Batch(urls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  const attempts = urls.map(async (url) => {
    const hash = await computeSHA256(url)
    results.set(url, hash)
  })
  await Promise.allSettled(attempts)
  return results
}

function fallbackHash(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const ch = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(16, "0")
}

async function readImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

async function readImageDimensionsBatch(
  urls: string[]
): Promise<Map<string, { width: number; height: number } | null>> {
  const results = new Map<string, { width: number; height: number } | null>()
  const attempts = urls.map(async (url) => {
    const dims = await readImageDimensions(url)
    results.set(url, dims)
  })
  await Promise.allSettled(attempts)
  return results
}

export async function processCapture(
  image: SupabaseImage,
  index: number,
  lifecycle: CaptureLifecycle = "processed",
): Promise<ProcessedCapture> {
  const [hash, dims] = await Promise.all([
    computeSHA256(image.url),
    readImageDimensions(image.url),
  ])

  return {
    id: generateCaptureId(image.name, index),
    filename: image.name,
    imageUrl: image.url,
    bucketPath: `snapshots/${image.name}`,
    uploadedAt: image.uploadedAt,
    processedAt: new Date().toISOString(),
    fileSize: image.fileSize,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    aspectRatio: computeAspectRatio(dims?.width ?? null, dims?.height ?? null),
    format: extractFormat(image.name),
    hash,
    source: "supabase",
    lifecycle,
    isDuplicate: false,
    metadata: {
      mimeType: null,
      colorSpace: null,
      hasAlpha: null,
      bitDepth: null,
    },
  }
}

const hashRegistry = new Map<string, string>()

export function registerHash(captureId: string, hash: string): void {
  hashRegistry.set(captureId, hash)
}

export function findDuplicate(hash: string, excludeId?: string): string | undefined {
  for (const [id, h] of hashRegistry) {
    if (h === hash && id !== excludeId) return id
  }
  return undefined
}

export function clearHashRegistry(): void {
  hashRegistry.clear()
}

export async function processBatch(
  images: SupabaseImage[],
): Promise<ProcessingResult> {
  idCounter = 0

  const hashMap = await computeSHA256Batch(images.map((i) => i.url))
  const dimsMap = await readImageDimensionsBatch(images.map((i) => i.url))

  const processed: ProcessedCapture[] = []
  const duplicates: ProcessedCapture[] = []

  const seenHashes = new Map<string, string>()

  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    const hash = hashMap.get(img.url) ?? fallbackHash(img.url)
    const dims = dimsMap.get(img.url) ?? null

    const existingId = seenHashes.get(hash)
    const isDup = !!existingId

    const capture: ProcessedCapture = {
      id: generateCaptureId(img.name, i),
      filename: img.name,
      imageUrl: img.url,
      bucketPath: `snapshots/${img.name}`,
      uploadedAt: img.uploadedAt,
      processedAt: new Date().toISOString(),
      fileSize: img.fileSize,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      aspectRatio: computeAspectRatio(dims?.width ?? null, dims?.height ?? null),
      format: extractFormat(img.name),
      hash,
      source: "supabase",
      lifecycle: isDup ? "processed" as const : "processed" as const,
      isDuplicate: isDup,
      duplicateOfId: isDup ? existingId : undefined,
      metadata: {
        mimeType: null,
        colorSpace: null,
        hasAlpha: null,
        bitDepth: null,
      },
    }

    if (!isDup) {
      seenHashes.set(hash, capture.id)
    }

    if (isDup) {
      duplicates.push(capture)
    } else {
      processed.push(capture)
    }

    registerHash(capture.id, hash)
  }

  return {
    captures: processed,
    duplicates,
    stats: {
      total: images.length,
      processed: processed.length,
      duplicates: duplicates.length,
      failed: 0,
    },
  }
}
