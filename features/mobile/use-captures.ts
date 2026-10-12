"use client"

import { useMemo } from "react"
import { useLiveSnapshots, type SupabaseImage } from "@/features/live/live-snapshots"

export interface MobileCaptures {
  /** Newest first. Only real files from the Supabase "snapshots" bucket. */
  images: SupabaseImage[]
  latest: SupabaseImage | null
  loading: boolean
  /** Human-readable, Spanish. null when everything is fine. */
  error: string | null
  /** True when storage simply isn't set up (not a failure the user can retry). */
  unavailable: boolean
  refresh: () => void
}

export function useMobileCaptures(): MobileCaptures {
  const { images, loading, error, refresh } = useLiveSnapshots()

  const sorted = useMemo(
    () => [...images].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [images],
  )

  const unavailable = error === "Supabase not configured"

  return {
    images: sorted,
    latest: sorted[0] ?? null,
    loading,
    error: error && !unavailable ? "No se pudieron cargar las capturas." : null,
    unavailable,
    refresh,
  }
}
