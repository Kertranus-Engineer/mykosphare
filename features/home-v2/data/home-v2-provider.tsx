"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"

import { useNow } from "@/features/mobile/use-now"
import { useCloudHome } from "./use-cloud-home"
import { buildIntelligenceView, type IntelligenceView } from "./intelligence-view"
import type { GrowDemoScenario } from "@/lib/grow/demo/simulation-demo"
import { COPY } from "../copy"
import { byRecency, toCropHistory, toCultivationModel } from "./adapters"
import { getDemoClock, getDemoClockServer, subscribeDemoClock } from "./demo/clock"
import { buildDemoWorld } from "./demo/world"
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
import type { CultivationModel, DeviceModel, EnvironmentModel, HistoryEntryModel, InsightModel, LabThemeId, PhotosModel } from "./model"
import { assertNoSimulationOutsideDemo, resolveCultivation, resolveDemoTelemetry, resolvePhotos, type DataMode, type ResolvedSources } from "./resolve"
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
  /** "demo" only while the demonstration mode is on (see config.ts for the development default). */
  mode: DataMode
  demo: DemoState
  /** A real device has reported to this browser: the example view yields to the person's own data. */
  deviceSeen: boolean
  setDemo: (next: { enabled: boolean; scenario?: GrowDemoScenario }) => void
  /** REAL / SIMULATED / UNAVAILABLE / LOADING / ERROR for each domain. */
  sources: ResolvedSources
  theme: LabThemeId
  setTheme: (theme: LabThemeId) => void
  environment: EnvironmentModel
  device: DeviceModel
  cultivation: CultivationModel
  photos: PhotosModel
  /** Alerts (first), then events and the crop record, newest first. Real session activity is not persisted. */
  history: HistoryEntryModel[]
  /** Example observation (demo only); `none` when no analysis exists. */
  insight: InsightModel
  retryPhotos: () => void
  retryCultivation: () => void
  retrySensors: () => void
  cloudStatus: string
  /** MYKO Intelligence over the owner's REAL readings. null in the example view, while loading, or without a registered chamber. */
  intelligence: IntelligenceView | null
  /** Active warning/critical alerts for the bell badge. */
  attentionCount: number
}

type Base = Pick<HomeV2Value, "request" | "mode" | "demo" | "deviceSeen" | "setDemo" | "theme" | "setTheme">
type Data = Pick<HomeV2Value, "sources" | "environment" | "device" | "cultivation" | "photos" | "history" | "insight" | "retryPhotos" | "retryCultivation" | "retrySensors" | "cloudStatus" | "intelligence">

const HomeV2Context = createContext<HomeV2Value | null>(null)

// Shown while the demo clock has not ticked yet (server render and first client paint).
const LOADING_ENVIRONMENT: EnvironmentModel = {
  status: "waiting",
  reason: "loading",
  title: COPY.environment.waitingTitle,
  detail: COPY.environment.waitingDetail,
}
const LOADING_DEVICE: DeviceModel = {
  kind: "connecting",
  label: "Conectando",
  provenance: "unavailable",
  tone: "muted",
  lastSampleAt: null,
  actuators: [
    { id: "fan", label: COPY.device.fan, state: "unknown" },
    { id: "humidifier", label: COPY.device.humidifier, state: "unknown" },
  ],
}
const NO_PHOTOS: PhotosModel = { status: "unavailable" }
const NO_INSIGHT: InsightModel = { status: "none" }
const noop = () => {}

/**
 * Single composition point for HOME V2. It first decides WHERE data comes from:
 *
 *  - demonstration ON  → the demo engine (one deterministic world). The shared telemetry, activity and
 *    captures hooks are NOT mounted, so nothing polls the device or the storage while demoing.
 *  - demonstration OFF → the owner-scoped cloud API and grow domain view,
 *    adapted into view models. Legacy telemetry and global snapshots are never mounted.
 *
 * Either way the screens receive the same view models and never know which source produced them.
 */
export function HomeV2Provider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()

  const request = useMemo<LabRequest>(() => parseLabRequest(new URLSearchParams(search.toString())), [search])

  // ── Demonstration mode: the visitor's saved choice, or the default (off); never changes in response to connection status ──
  const stored = useSyncExternalStore(subscribeDemo, getDemoSnapshot, getDemoServerSnapshot)
  const deviceSeen = false // Connection is resolved from the signed-in owner's persisted device, never browser storage.
  const urlDemo = useMemo(() => demoFromUrl(request.grow), [request.grow])
  const demo: DemoState = search.get("view") === "real" ? DEMO_OFF : urlDemo ?? stored
  const urlDemoKey = urlDemo ? urlDemo.scenario : null

  useEffect(() => {
    // Adopt the internal URL switch into the preference, so clean links keep the demo on.
    if (urlDemoKey !== null) setDemoState({ enabled: true, scenario: urlDemoKey })
  }, [urlDemoKey])

  const setDemo = useCallback<HomeV2Value["setDemo"]>(
    (next) => {
      // Turning the example view on by hand while a device is connected is deliberate: keep it until switched off.
      setDemoState(
        next.enabled
          ? { enabled: true, scenario: next.scenario ?? stored.scenario ?? DEFAULT_DEMO_SCENARIO, pinned: deviceSeen || stored.pinned === true }
          : DEMO_OFF,
      )
      // The URL switch would otherwise keep overriding the choice.
      if (request.grow.kind === "simulation" || search.has("view")) router.replace(labHref(pathname, { grow: { kind: "unconfigured" } }))
    },
    [stored.scenario, stored.pinned, deviceSeen, request.grow.kind, router, pathname, search],
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

  const mode: DataMode = demo.enabled ? "demo" : "normal"
  const base = useMemo<Base>(
    () => ({ request, mode, demo, deviceSeen, setDemo, theme, setTheme }),
    [request, mode, demo, deviceSeen, setDemo, theme, setTheme],
  )

  return demo.enabled ? (
    <DemoSource base={base}>{children}</DemoSource>
  ) : (
    <LiveSource base={base}>{children}</LiveSource>
  )
}

/** Demonstration data: pure function of (scenario, minute). Its only timer pauses while the page is hidden. */
function DemoSource({ base, children }: { base: Base; children: ReactNode }) {
  const minute = useSyncExternalStore(subscribeDemoClock, getDemoClock, getDemoClockServer)
  const world = useMemo(() => (minute !== null ? buildDemoWorld(base.demo.scenario, minute) : null), [base.demo.scenario, minute])

  const data = useMemo<Data>(() => {
    const environment = world?.environment ?? LOADING_ENVIRONMENT
    const cultivation: CultivationModel = world?.cultivation ?? { status: "loading" }
    // Demonstration pictures are never shown together with real captures.
    const photos: PhotosModel = world ? { status: "ready", items: world.photos } : { status: "loading" }
    return {
      environment,
      device: world?.device ?? LOADING_DEVICE,
      cultivation,
      photos,
      history: world?.history ?? [],
      insight: world?.insight ?? NO_INSIGHT,
      sources: { mode: "demo", telemetry: resolveDemoTelemetry(environment), cultivation: resolveCultivation(cultivation), photos: resolvePhotos(photos) },
      retryPhotos: noop,
      retryCultivation: noop,
      retrySensors: noop,
      cloudStatus: "demo",
      intelligence: null,
    }
  }, [world])

  return <Provide base={base} data={data}>{children}</Provide>
}

/** Real data: the existing hooks, adapted. Demonstration values never reach this branch. */
function LiveSource({ base, children }: { base: Base; children: ReactNode }) {
  const chamberId = base.request.grow.kind === "real" ? base.request.grow.chamberId : undefined
  const cloud = useCloudHome(chamberId)
  const selected = cloud.state.result?.status === "ready" ? cloud.state.result.chamber.id : chamberId
  const growRequest = selected ? { kind: "real" as const, chamberId: selected } : effectiveGrowRequest(base.demo, base.request.grow)
  const { view, retry } = useGrowView(growRequest)
  const { environment, device } = cloud
  const cultivation = useMemo(() => toCultivationModel(view), [view])
  // Legacy snapshots are global; do not expose them as this owner's captures.
  const photos: PhotosModel = NO_PHOTOS
  const nowMs = useNow(15_000)
  const intelligence = useMemo(() => (nowMs === null ? null : buildIntelligenceView(cloud.state, nowMs)), [cloud.state, nowMs])
  const history = useMemo(() => {
    const crop = cultivation.status === "ready" ? toCropHistory(cultivation.log) : []
    return [...(intelligence?.historyEntries ?? []), ...crop].sort(byRecency)
  }, [cultivation, intelligence])

  const data = useMemo<Data>(
    () => ({
      environment,
      device,
      cultivation,
      photos,
      history,
      insight: NO_INSIGHT,
      sources: { mode: "normal", telemetry: environment.status === "ready" ? "REAL" : "UNAVAILABLE", cultivation: resolveCultivation(cultivation), photos: resolvePhotos(photos) },
      retryPhotos: noop,
      retryCultivation: retry,
      retrySensors: cloud.retry,
      cloudStatus: cloud.state.networkError ? "network_error" : cloud.state.result?.status ?? "loading",
      intelligence,
    }),
    [environment, device, cultivation, photos, history, cloud.retry, cloud.state, retry, intelligence],
  )

  return <Provide base={base} data={data}>{children}</Provide>
}

function Provide({ base, data, children }: { base: Base; data: Data; children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const leaks = assertNoSimulationOutsideDemo(data.sources)
    if (leaks.length > 0) console.error(`[HOME V2] simulated data outside the demo mode: ${leaks.join(", ")}`)
  }, [data.sources])

  const attentionCount = useMemo(
    () => data.history.filter((entry) => entry.at === null && (entry.tone === "warn" || entry.tone === "crit")).length,
    [data.history],
  )

  const value = useMemo<HomeV2Value>(() => ({ ...base, ...data, deviceSeen: data.device.provenance === "real", attentionCount }), [base, data, attentionCount])

  return <HomeV2Context.Provider value={value}>{children}</HomeV2Context.Provider>
}

export function useHomeV2(): HomeV2Value {
  const value = useContext(HomeV2Context)
  if (!value) throw new Error("useHomeV2 must be used inside <HomeV2Provider>")
  return value
}
