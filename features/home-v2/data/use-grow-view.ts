"use client"

import { useMemo, useSyncExternalStore } from "react"

import type { GrowRequest } from "@/features/grow/data/grow-request"
import { createGrowStore } from "@/features/grow/data/grow-store"
import { modeOf, type GrowView } from "@/features/grow/data/grow-view"

/**
 * Serves the existing grow view (same store/loader the Grower routes use) for a
 * request chosen by HOME V2's own source resolution, not by the URL alone.
 * The server render always emits "loading"; data is computed on the client.
 */
export function useGrowView(request: GrowRequest): { view: GrowView; retry: () => void } {
  const key = JSON.stringify(request)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the stable identity of `request`
  const stableRequest = useMemo(() => request, [key])
  const store = useMemo(() => createGrowStore(stableRequest), [stableRequest])
  const serverView = useMemo<GrowView>(() => ({ status: "loading", mode: modeOf(stableRequest) }), [stableRequest])
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, () => serverView)
  return { view, retry: store.retry }
}
