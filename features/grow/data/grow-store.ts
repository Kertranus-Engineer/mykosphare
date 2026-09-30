import type { GrowRequest } from "./grow-request"
import { buildSimulationView, fetchRealGrowView, modeOf, type GrowView } from "./grow-view"

export const GROW_REFRESH_MS = 30_000

export interface GrowStore {
  subscribe(listener: () => void): () => void
  getSnapshot(): GrowView
  retry(): void
}

/**
 * Tiny external store per request. Starts work on first subscriber, stops on
 * the last. Simulation re-evaluates locally; real mode polls the v2 API.
 */
export function createGrowStore(request: GrowRequest): GrowStore {
  const mode = modeOf(request)
  let view: GrowView =
    request.kind === "unconfigured" || request.kind === "invalid"
      ? { status: request.kind, mode: null }
      : { status: "loading", mode }
  const listeners = new Set<() => void>()
  let timer: ReturnType<typeof setInterval> | null = null
  let generation = 0

  const set = (next: GrowView) => {
    view = next
    listeners.forEach((listener) => listener())
  }

  const refresh = () => {
    if (request.kind === "simulation") {
      set(buildSimulationView(request, new Date()))
    } else if (request.kind === "real") {
      const current = ++generation
      void fetchRealGrowView(request.chamberId).then((next) => {
        if (current === generation) set(next)
      })
    }
  }

  const start = () => {
    if (request.kind !== "simulation" && request.kind !== "real") return
    refresh()
    timer = setInterval(refresh, GROW_REFRESH_MS)
  }

  const stop = () => {
    if (timer) clearInterval(timer)
    timer = null
    generation++
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      if (listeners.size === 1) start()
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) stop()
      }
    },
    getSnapshot: () => view,
    retry() {
      if (request.kind === "real") set({ status: "loading", mode })
      refresh()
    },
  }
}
