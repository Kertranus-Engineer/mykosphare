"use client"

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { parseGrowRequest, type GrowRequest } from "./grow-request"
import { createGrowStore } from "./grow-store"
import { modeOf, type GrowView } from "./grow-view"

interface GrowContextValue {
  request: GrowRequest
  view: GrowView
  retry: () => void
}

const GrowContext = createContext<GrowContextValue | null>(null)

/**
 * Resolves the Grower view from the URL. The server render always emits the
 * loading view; data is computed on the client, so relative times never
 * mismatch during hydration.
 */
export function GrowProvider({ children }: { children: ReactNode }) {
  const rawQuery = useSearchParams().toString()
  const request = useMemo(() => parseGrowRequest(new URLSearchParams(rawQuery)), [rawQuery])
  const store = useMemo(() => createGrowStore(request), [request])
  const serverView = useMemo<GrowView>(() => ({ status: "loading", mode: modeOf(request) }), [request])
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, () => serverView)
  const value = useMemo(() => ({ request, view, retry: store.retry }), [request, view, store])
  return <GrowContext.Provider value={value}>{children}</GrowContext.Provider>
}

export function useGrow(): GrowContextValue {
  const context = useContext(GrowContext)
  if (!context) throw new Error("useGrow must be used inside GrowProvider")
  return context
}
