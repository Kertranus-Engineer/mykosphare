"use client"

import { useSearchParams } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"

import { useGrow } from "@/features/grow/data/grow-provider"
import { useMobileData } from "@/features/mobile/mobile-data-context"
import { useMobileCaptures } from "@/features/mobile/use-captures"
import { toCultivationModel, toDeviceModel, toEnvironmentModel, toHistoryEntries, toPhotosModel } from "./adapters"
import { buildDemoPhotos } from "./demo-frames"
import { DEFAULT_LAB_THEME, isLabTheme, LAB_THEME_STORAGE_KEY, type LabRequest } from "./lab-request"
import type { CultivationModel, DeviceModel, EnvironmentModel, HistoryEntryModel, LabThemeId, PhotosModel } from "./model"

// ── Theme (lab-only preference; never touches the app-wide theme) ─────────

const themeListeners = new Set<() => void>()
/** Used only when localStorage is unavailable, so a pick still works for the session. */
let memoryTheme: LabThemeId | null = null

function readStoredTheme(): LabThemeId | null {
  try {
    const stored = localStorage.getItem(LAB_THEME_STORAGE_KEY)
    return isLabTheme(stored) ? stored : memoryTheme
  } catch {
    return memoryTheme
  }
}

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    themeListeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

// ── Context ───────────────────────────────────────────────

interface HomeV2Value {
  request: LabRequest
  theme: LabThemeId
  setTheme: (theme: LabThemeId) => void
  environment: EnvironmentModel
  device: DeviceModel
  cultivation: CultivationModel
  photos: PhotosModel
  /** Session activity + crop logbook, active alerts first. */
  history: HistoryEntryModel[]
  retryPhotos: () => void
  retryCultivation: () => void
  /** Active warning/critical alerts for the bell badge. */
  attentionCount: number
}

const HomeV2Context = createContext<HomeV2Value | null>(null)

const HOUR_MS = 3_600_000

/**
 * Single composition point for HOME V2. It only adapts what already exists
 * (mobile telemetry, grow domain view, captures hook); it measures nothing and
 * mounts nothing twice, so tab changes never re-poll or reset session history.
 */
export function HomeV2Provider({ children }: { children: ReactNode }) {
  const { tel, activity, attentionCount } = useMobileData()
  const captures = useMobileCaptures()
  const { request: grow, view, retry } = useGrow()
  const search = useSearchParams()

  const demoPhotos = grow.kind === "simulation" && search.get("photos") === "demo"
  const request = useMemo<LabRequest>(() => ({ grow, demoPhotos }), [grow, demoPhotos])

  const environment = useMemo(() => toEnvironmentModel(tel), [tel])
  const device = useMemo(() => toDeviceModel(tel), [tel])
  const cultivation = useMemo(() => toCultivationModel(view), [view])
  const history = useMemo(() => toHistoryEntries(activity, cultivation), [activity, cultivation])

  // Demo frames are keyed to the run start and the current hour so they do not
  // regenerate (and flicker) on every 30 s refresh of the grow view.
  const demoStart = view.status === "ready" ? view.snapshot.run.startedAt : null
  const demoHour = view.status === "ready" ? Math.floor(new Date(view.evaluatedAt).getTime() / HOUR_MS) : null
  const demoItems = useMemo(
    () => (demoPhotos && demoStart !== null && demoHour !== null ? buildDemoPhotos(demoStart, new Date(demoHour * HOUR_MS)) : null),
    [demoPhotos, demoStart, demoHour],
  )

  const capturesPhotos = useMemo(
    () => toPhotosModel({ images: captures.images, loading: captures.loading, error: captures.error, unavailable: captures.unavailable }),
    [captures.images, captures.loading, captures.error, captures.unavailable],
  )
  const photos = useMemo<PhotosModel>(
    () => (demoItems && demoItems.length > 0 ? { status: "ready", items: demoItems } : capturesPhotos),
    [demoItems, capturesPhotos],
  )

  // Theme: the lab's own stored preference; nothing stored → default look.
  const stored = useSyncExternalStore(subscribeTheme, readStoredTheme, () => null)
  const theme = stored ?? DEFAULT_LAB_THEME

  const setTheme = useCallback((next: LabThemeId) => {
    try {
      localStorage.setItem(LAB_THEME_STORAGE_KEY, next)
    } catch {
      // storage unavailable: fall through, the in-memory notification below still applies it this session
    }
    memoryTheme = next
    themeListeners.forEach((listener) => listener())
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute("data-hv2-theme", theme)
    return () => root.removeAttribute("data-hv2-theme")
  }, [theme])

  const value = useMemo<HomeV2Value>(
    () => ({
      request,
      theme,
      setTheme,
      environment,
      device,
      cultivation,
      photos,
      history,
      retryPhotos: captures.refresh,
      retryCultivation: retry,
      attentionCount,
    }),
    [request, theme, setTheme, environment, device, cultivation, photos, history, captures.refresh, retry, attentionCount],
  )

  return <HomeV2Context.Provider value={value}>{children}</HomeV2Context.Provider>
}

export function useHomeV2(): HomeV2Value {
  const value = useContext(HomeV2Context)
  if (!value) throw new Error("useHomeV2 must be used inside <HomeV2Provider>")
  return value
}
