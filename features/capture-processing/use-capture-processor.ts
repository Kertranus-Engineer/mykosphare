"use client"

import { useEffect, useState, useCallback } from "react"
import type { ProcessedCapture, ProcessingResult } from "@/lib/capture-processing/types"
import { processBatch, clearHashRegistry } from "@/lib/capture-processing/capture-processor"
import { detectDuplicates } from "@/lib/capture-processing/duplicate-detector"
import type { SupabaseImage } from "@/features/live/live-snapshots"

interface UseCaptureProcessorResult {
  captures: ProcessedCapture[]
  duplicates: ProcessedCapture[]
  stats: ProcessingResult["stats"]
  loading: boolean
  error: string | null
  reprocess: () => void
}

export function useCaptureProcessor(
  images: SupabaseImage[],
): UseCaptureProcessorResult {
  const [captures, setCaptures] = useState<ProcessedCapture[]>([])
  const [duplicates, setDuplicates] = useState<ProcessedCapture[]>([])
  const [stats, setStats] = useState<ProcessingResult["stats"]>({
    total: 0,
    processed: 0,
    duplicates: 0,
    failed: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const reprocess = useCallback(() => {
    clearHashRegistry()
    setTick((t) => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (images.length === 0) {
        setCaptures([])
        setDuplicates([])
        setStats({ total: 0, processed: 0, duplicates: 0, failed: 0 })
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await processBatch(images)
        if (cancelled) return

        const deduped = detectDuplicates(result.captures)
        const dupes = deduped.filter((c) => c.isDuplicate)
        const unique = deduped.filter((c) => !c.isDuplicate)

        setCaptures(unique)
        setDuplicates(dupes)
        setStats({
          ...result.stats,
          duplicates: dupes.length,
        })
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Capture processing failed")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [images, tick])

  return { captures, duplicates, stats, loading, error, reprocess }
}
