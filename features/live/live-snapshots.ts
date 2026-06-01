"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

const BUCKET_NAME = "snapshots"

export interface SupabaseImage {
  name: string
  url: string
  uploadedAt: string
  fileSize: number
  resolution: { width: number; height: number } | null
  metadata: Record<string, unknown>
}

export interface LiveBucketStats {
  totalImages: number
  storageUsedBytes: number
  avgCaptureInterval: number
  firstCapture: string | null
  latestCapture: string | null
  images: SupabaseImage[]
}

function computeImageStats(images: SupabaseImage[]): Omit<LiveBucketStats, "images"> {
  if (images.length === 0) {
    return {
      totalImages: 0,
      storageUsedBytes: 0,
      avgCaptureInterval: 0,
      firstCapture: null,
      latestCapture: null,
    }
  }

  const sorted = [...images].sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
  )

  const firstTs = new Date(sorted[0].uploadedAt).getTime()
  const lastTs = new Date(sorted[sorted.length - 1].uploadedAt).getTime()
  const totalMs = lastTs - firstTs
  const avgInterval = sorted.length > 1 ? totalMs / (sorted.length - 1) / (1000 * 60 * 60) : 0

  const storage = images.reduce((acc, img) => acc + img.fileSize, 0)

  return {
    totalImages: images.length,
    storageUsedBytes: storage,
    avgCaptureInterval: avgInterval,
    firstCapture: sorted[0].uploadedAt,
    latestCapture: sorted[sorted.length - 1].uploadedAt,
  }
}

export function useLiveSnapshots(): {
  images: SupabaseImage[]
  stats: LiveBucketStats
  loading: boolean
  error: string | null
  refresh: () => void
} {
  const [images, setImages] = useState<SupabaseImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setLoading(false)
          setError("Supabase not configured")
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        const { data: files, error: listErr } = await supabase.storage
          .from(BUCKET_NAME)
          .list()

        if (listErr) {
          if (!cancelled) {
            setError(listErr.message)
            setLoading(false)
          }
          return
        }

        const imageFiles = (files ?? []).filter(
          (f) => !f.name.startsWith(".") && /\.(jpg|jpeg|png|svg|webp|gif|avif)$/i.test(f.name)
        )

        const results: SupabaseImage[] = imageFiles.map((f) => {
          const url = supabase.storage.from(BUCKET_NAME).getPublicUrl(f.name).data.publicUrl
          return {
            name: f.name,
            url,
            uploadedAt: f.created_at ?? new Date().toISOString(),
            fileSize: f.metadata?.size ?? 0,
            resolution: null,
            metadata: f.metadata ?? {},
          }
        })

        if (!cancelled) {
          setImages(results)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load snapshots")
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [tick])

  const stats: LiveBucketStats = {
    ...computeImageStats(images),
    images,
  }

  return { images, stats, loading, error, refresh }
}
