"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"

import { useLiveSnapshots } from "@/features/live/live-snapshots"
import { useMobileData } from "@/features/mobile/mobile-data-context"
import type { GrowDemoScenario } from "@/lib/grow/demo/simulation-demo"
import { toCultivationModel, toDeviceModel, toEnvironmentModel, toHistoryEntries, toPhotosModel } from "./adapters"
import { buildDemoPhotos } from "./demo-frames"
import {
  DEFAULT_DEMO_SCENARIO,
  DEMO_OFF,
  demoFromUrl,
  effectiveGrowRequest,
  getDemoServerSnapshot,
  getDemoSnapshot,
  setDemoState,
  subscribeDemo,
  type DemoState,
} from "./demo-mode"
import { DEFAULT_LAB_THEME, isLabTheme, LAB_THEME_STORAGE_KEY, labHref, parseLabRequest, type LabRequest } from "./lab-request"
import type { CultivationModel, DeviceModel, EnvironmentModel, HistoryEntryModel, LabThemeId, PhotosModel } from "./model"
import { assertNoSimulationOutsideDemo, resolveSources, type DataMode, type ResolvedSources } from "./resolve"
import { useGrowView } from "./use-grow-view"

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
  /** URL-level request (only a real chamber selection travels in links). */
  request: LabRequest
  /** "demo" only while the user explicitly enabled the demonstration mode. */
  mode: DataMode
  demo: DemoState
  setDemo: (next: { enabled: boolean; scenario?: GrowDemoScenario }) => void
  /** REAL / SIMULATED / UNAVAILABLE / LOADING / ERROR for each domain. */
  sources: ResolvedSources
  theme: LabThemeId
  setTheme: (theme: LabThemeId) => void
  environment: EnvironmentModel
  device: DeviceModel
  cultivation: CultivationModel
  photos: PhotosModel
  /** Session alerts and events (alerts first). Not persisted history. */
  history: HistoryEntryModel[]
  retryPhotos: () => void
  retryCultivation: () => void
  /** Active warning/critical alerts for the bell badge. */
  attentionCount: number
}

const HomeV2Context = createContext<HomeV2Value | null>(null)

const HOUR_MS = 3_600_000

/**
 * Single composition point for HOME V2. It resolves every data source ONCE
 * (see resolve.ts), then adapts what already exists (mobile telemetry, grow
 * domain view, captures hook) into view models. It measures nothing itself and
 * mounts nothing twice, so tab changes never re-poll or reset session history.
 */
export function HomeV2Provider({ children }: { children: ReactNode }) {
  const { tel, activity } = useMobileData()
  const captures = useLiveSnapshots()
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()

  const request = useMemo<LabRequest>(() => parseLabRequest(new URLSearchParams(search.toString())), [search])

  // ── Demonstration mode: explicit opt-in, off by default ──
  const stored = useSyncExternalStore(subscribeDemo, getDemoSnapshot, getDemoServerSnapshot)
  const urlDemo = useMemo(() => demoFromUrl(request.grow), [request.grow]) // internal-testing compatibility only
  const demo: DemoState = urlDemo ?? stored
  const urlDemoKey = urlDemo ? urlDemo.scenario : null

  useEffect(() => {
    // Adopt the internal URL switch into the preference, so clean links keep the demo on.
    if (urlDemoKey !== null) setDemoState({ enabled: true, scenario: urlDemoKey })
  }, [urlDemoKey])

  const setDemo = useCallback<HomeV2Value["setDemo"]>(
    (next) => {
      setDemoState(next.enabled ? { enabled: true, scenario: next.scenario ?? stored.scenario ?? DEFAULT_DEMO_SCENARIO } : DEMO_OFF)
      // The URL switch would otherwise keep overriding the choice.
      if (request.grow.kind === "simulation") router.replace(labHref(pathname, { grow: { kind: "unconfigured" } }))
    },
    [stored.scenario, request.grow.kind, router, pathname],
  )

  const mode: DataMode = demo.enabled ? "demo" : "normal"
  const growRequest = useMemo(() => effectiveGrowRequest(demo, request.grow), [demo, request.grow])
  const { view, retry } = useGrowView(growRequest)

  // ── Models ──
  const environment = useMemo(() => toEnvironmentModel(tel, mode), [tel, mode])
  const device = useMemo(() => toDeviceModel(tel, mode), [tel, mode])
  const cultivation = useMemo(() => toCultivationModel(view), [view])
  const history = useMemo(() => toHistoryEntries(activity, mode), [activity, mode])

  // Demo frames are keyed to the run start and the current hour so they do not
  // regenerate (and flicker) on every 30 s refresh of the grow view.
  const demoStart = mode === "demo" && view.status === "ready" ? view.snapshot.run.startedAt : null
  const demoHour = mode === "demo" && view.status === "ready" ? Math.floor(new Date(view.evaluatedAt).getTime() / HOUR_MS) : null
  const demoItems = useMemo(
    () => (demoStart !== null && demoHour !== null ? buildDemoPhotos(demoStart, new Date(demoHour * HOUR_MS)) : null),
    [demoStart, demoHour],
  )
  const capturesPhotos = useMemo(
    () => toPhotosModel({ images: captures.images, loading: captures.loading, error: captures.error }),
    [captures.images, captures.loading, captures.error],
  )
  // Demonstration photos and real captures are NEVER shown together.
  const photos = useMemo<PhotosModel>(() => {
    if (mode === "demo") {
      if (demoItems && demoItems.length > 0) return { status: "ready", items: demoItems }
      return view.status === "loading" ? { status: "loading" } : { status: "empty" }
    }
    return capturesPhotos
  }, [mode, demoItems, view.status, capturesPhotos])

  const sources = useMemo(() => resolveSources({ mode, tel, cultivation, photos }), [mode, tel, cultivation, photos])

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const leaks = assertNoSimulationOutsideDemo(sources)
    if (leaks.length > 0) console.error(`[HOME V2] simulated data outside the demo mode: ${leaks.join(", ")}`)
  }, [sources])

  const attentionCount = useMemo(
    () => history.filter((entry) => entry.at === null && (entry.tone === "warn" || entry.tone === "crit")).length,
    [history],
  )

  // ── Theme ──
  const storedTheme = useSyncExternalStore(subscribeTheme, readStoredTheme, () => null)
  const theme = storedTheme ?? DEFAULT_LAB_THEME

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
      mode,
      demo,
      setDemo,
      sources,
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
    [request, mode, demo, setDemo, sources, theme, setTheme, environment, device, cultivation, photos, history, captures.refresh, retry, attentionCount],
  )

  return <HomeV2Context.Provider value={value}>{children}</HomeV2Context.Provider>
}

export function useHomeV2(): HomeV2Value {
  const value = useContext(HomeV2Context)
  if (!value) throw new Error("useHomeV2 must be used inside <HomeV2Provider>")
  return value
}
