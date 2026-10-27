import type { HomeReading, HomeResult } from "@/lib/grow/application/home-read"
import type { DeviceModel, EnvironmentModel, MetricModel } from "./model"

export const CLOUD_POLL_MS = 30_000
export const CLOUD_STALE_MS = 90_000
export const CLOUD_OFFLINE_MS = 300_000
export interface CloudHomeState { result: HomeResult | null; networkError: boolean; checkedAt: number }

const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const stamp = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v))
const metric = (v: unknown) => v === null || typeof v === "number" && Number.isFinite(v)

export function isHomeResult(value: unknown): value is HomeResult {
  if (!object(value)) return false
  if (value.status !== "ready") return ["unauthorized", "unconfigured", "not_found", "unavailable"].includes(String(value.status))
  if (!object(value.chamber) || typeof value.chamber.id !== "string" || typeof value.chamber.name !== "string") return false
  const d = value.device
  if (d !== null && (!object(d) || typeof d.id !== "string" || typeof d.name !== "string" || typeof d.enabled !== "boolean" || (d.lastSeenAt !== null && !stamp(d.lastSeenAt)))) return false
  return Array.isArray(value.readings) && value.readings.length <= 120 && value.readings.every(r => object(r) && stamp(r.observedAt) && metric(r.temperature) && metric(r.humidity))
}

/** Each chamber gets its own store. Network failure clears owner data. */
export function createCloudHomeStore(chamberId?: string, fetchImpl: typeof fetch = fetch, now: () => number = Date.now) {
  let state: CloudHomeState = { result: null, networkError: false, checkedAt: 0 }
  const listeners = new Set<() => void>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let current: AbortController | undefined
  let generation = 0
  const emit = () => listeners.forEach(listener => listener())
  const refresh = async () => {
    const version = ++generation
    current?.abort()
    const controller = new AbortController()
    current = controller
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetchImpl(`/api/v2/home${chamberId ? `?chamber=${encodeURIComponent(chamberId)}` : ""}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      // A revoked session must clear previously visible owner data even if a
      // proxy responds with HTML or an otherwise malformed body.
      if (response.status === 401 || response.status === 403) {
        if (version !== generation) return
        state = { result: { status: "unauthorized" }, networkError: false, checkedAt: now() }
        return
      }
      const body: unknown = await response.json()
      if (!isHomeResult(body) || (!response.ok && ![404, 503].includes(response.status))) throw new Error("unavailable")
      if (version !== generation) return
      // Without a fresh ownership check, cached values could belong to a
      // previous account after logout or account switching.
      state = { result: body, networkError: body.status === "unavailable", checkedAt: now() }
    } catch {
      if (version !== generation) return
      state = { result: { status: "unavailable" }, networkError: true, checkedAt: now() }
    } finally {
      clearTimeout(timeout)
      if (version === generation) {
        emit()
        if (timer) clearTimeout(timer)
        if (listeners.size) timer = setTimeout(() => { void refresh() }, CLOUD_POLL_MS)
      }
    }
  }
  return {
    getSnapshot: () => state,
    refresh,
    subscribe(listener: () => void) {
      listeners.add(listener)
      if (listeners.size === 1) void refresh()
      return () => { listeners.delete(listener); if (!listeners.size) { generation++; current?.abort(); clearTimeout(timer) } }
    },
  }
}

export function cloudHomeModels(state: CloudHomeState, now = Date.now()): { environment: EnvironmentModel; device: DeviceModel } {
  const result = state.result
  const record = result?.status === "ready" ? result.device : null
  const readings = result?.status === "ready" ? result.readings : []
  const latest = readings[0]
  const age = latest ? now - Date.parse(latest.observedAt) : Infinity
  const seenAge = record?.lastSeenAt ? now - Date.parse(record.lastSeenAt) : Infinity
  const loading = !result && !state.networkError
  const offline = !record?.enabled || age >= CLOUD_OFFLINE_MS || seenAge >= CLOUD_OFFLINE_MS || age < 0
  const stale = state.networkError || age >= CLOUD_STALE_MS || seenAge >= CLOUD_STALE_MS
  const kind = loading ? "connecting" : offline ? "offline" : stale ? "stale" : "live"
  const device: DeviceModel = {
    kind, name: record?.name, lastSeenAt: record?.lastSeenAt ?? null,
    label: loading ? "Conectando" : kind === "live" ? "Conectado" : kind === "stale" ? "Sin señal reciente" : "Desconectado",
    provenance: record ? "real" : "unavailable", tone: kind === "live" ? "ok" : "muted",
    lastSampleAt: latest?.observedAt ?? null,
    actuators: [{ id: "fan", label: "Ventilación", state: "unknown" }, { id: "humidifier", label: "Humidificador", state: "unknown" }],
  }
  if (!latest) return { device, environment: { status: "waiting", reason: loading ? "loading" : "disconnected", title: "Esperando lecturas", detail: state.networkError || result?.status === "unavailable" ? "No puedo consultar tus sensores. Volveré a intentarlo." : result?.status === "unauthorized" ? "Inicia sesión para ver tu dispositivo." : "Todavía no hay una lectura real de tu dispositivo." } }
  const toMetric = (id: "temperature" | "humidity"): MetricModel => {
    const measured = [...readings].reverse().filter((r): r is HomeReading & Record<typeof id, number> => r[id] !== null)
    return {
      id, label: id === "temperature" ? "Temperatura" : "Humedad", unit: id === "temperature" ? "°C" : "%",
      value: latest[id], decimals: 1, minSpan: id === "temperature" ? 2 : 8,
      trend: null, delta: null, condition: null,
      series: measured.map(r => r[id]), times: measured.map(r => new Date(r.observedAt).toLocaleTimeString("es-CL")),
    }
  }
  return { device, environment: {
    status: "ready", provenance: "real", dimmed: kind !== "live", window: "persisted",
    metrics: [toMetric("temperature"), toMetric("humidity")],
    overall: { label: kind === "live" ? "Lecturas recibidas" : "Sin señal reciente", detail: kind === "live" ? "Temperatura y humedad medidas por tu ESP32." : "Conservo la última lectura real. No representa el estado actual.", tone: kind === "live" ? "info" : "muted", level: kind === "live" ? "optimizing" : "nodata" },
  } }
}
