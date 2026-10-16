/**
 * DEMO DATA ENGINE.
 *
 * One deterministic "world" for the demonstration mode: the example crop, its
 * pictures and logbook, the sensor series, the actuators, the alerts, the events
 * and the example insight are all derived from the SAME inputs (scenario + minute),
 * so no screen can disagree with another.
 *
 *  - Pure: no Date.now(), no Math.random(). Same (scenario, now) → same world.
 *  - Smooth: values are slow sine waves around a baseline plus a scenario drift
 *    that ramps in over an hour; nothing jumps between minutes.
 *  - Coherent: the events, alerts, actuators and insight are computed from the
 *    value curves (e.g. "humidity left the range" is stamped at the sample where
 *    the curve crosses the profile's limit), never scripted independently.
 *  - Honest: everything it produces is marked simulated. It is never written to
 *    storage and never mixed with real data (the provider replaces, not merges).
 *
 * The story restarts every two hours (EPOCH): the drift of a scenario always
 * happened "just before" the current block, so each scenario can be inspected at
 * any time without waiting for it to unfold.
 */
import { SAMPLE_PLEUROTUS_OSTREATUS_PROFILE } from "@/lib/grow/fixtures"
import { presentSpecies, stageLabel } from "@/lib/grow/presentation"
import { suggestStageByDays } from "@/lib/grow/stages"
import type { GrowDemoScenario } from "@/lib/grow/demo/simulation-demo"
import type { MetricTarget } from "@/lib/grow/types"
import { COPY } from "../../copy"
import { buildStageSteps, resolveStagePlan, toCropHistory } from "../adapters"
import type {
  ActuatorModel,
  CultivationModel,
  DeviceModel,
  EnvironmentModel,
  HistoryCategory,
  HistoryEntryModel,
  InsightModel,
  LogEntryModel,
  MetricModel,
  PhotoModel,
  Tone,
} from "../model"
import { DEMO_CROP_DAY, DEMO_CROP_EVENTS, DEMO_CROP_STAGE, DEMO_PHOTO_CAPTIONS, DEMO_PHOTO_DAYS } from "./crop"
import { demoHeroUrl, demoPhotoThumbUrl, demoPhotoUrl } from "./assets"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const EPOCH_MS = 2 * HOUR
const DRIFT_STARTS_BEFORE_EPOCH_MS = 110 * MINUTE
const DRIFT_RAMP_MS = 60 * MINUTE
const SAMPLE_SPACING_MS = 5 * MINUTE
const SAMPLE_COUNT = 36
const STALE_AGE_MS = 12 * MINUTE
const OFFLINE_AGE_MS = 50 * MINUTE

type MetricId = "temperature" | "humidity"
type Condition = "ok" | "low" | "high" | "critical-low" | "critical-high"

const BASE: Record<MetricId, number> = { temperature: 22.1, humidity: 68 }
const NOISE: Record<MetricId, number> = { temperature: 0.3, humidity: 1.2 }
const UNIT: Record<MetricId, string> = { temperature: "°C", humidity: "%" }
const NOISE_SEED: Record<MetricId, number> = { temperature: 1.7, humidity: 4.1 }

/** Where each metric settles, per scenario. Missing = stays at its baseline. */
const DRIFT: Partial<Record<GrowDemoScenario, Partial<Record<MetricId, number>>>> = {
  dry: { humidity: 53.5 },
  humid: { humidity: 81.5 },
  cold: { temperature: 18.3 },
  hot: { temperature: 26.4 },
  critical: { humidity: 41, temperature: 25.8 },
}

const TARGETS = SAMPLE_PLEUROTUS_OSTREATUS_PROFILE.stageTargets[DEMO_CROP_STAGE]!
const TARGET: Record<MetricId, MetricTarget> = {
  temperature: TARGETS.temperature!,
  humidity: TARGETS.humidity!,
}

// ── small helpers ─────────────────────────────────────────

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (x: number) => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}
const round1 = (n: number) => Math.round(n * 10) / 10
/** Same number format as the metric tiles (dot decimals, one decimal), so a value reads identically everywhere. */
const num = (n: number) => n.toFixed(1)
const pad = (n: number) => String(n).padStart(2, "0")

function clockLabel(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Slow, smooth, bounded in [-1, 1]; deterministic in absolute time. */
function wave(ms: number, seed: number): number {
  const m = ms / MINUTE
  return Math.sin(m / 53 + seed) * 0.55 + Math.sin(m / 131 + seed * 2.3) * 0.3 + Math.sin(m / 19 + seed * 0.7) * 0.15
}

function epochOf(now: number): number {
  return Math.floor(now / EPOCH_MS) * EPOCH_MS
}

function valueAt(metric: MetricId, t: number, scenario: GrowDemoScenario, epoch: number): number {
  const target = DRIFT[scenario]?.[metric]
  const driftStart = epoch - DRIFT_STARTS_BEFORE_EPOCH_MS
  const ramp = target === undefined ? 0 : smooth((t - driftStart) / DRIFT_RAMP_MS)
  const base = BASE[metric] + ((target ?? BASE[metric]) - BASE[metric]) * ramp
  return round1(base + wave(t, NOISE_SEED[metric]) * NOISE[metric])
}

function conditionOf(metric: MetricId, value: number): Condition {
  const t = TARGET[metric]
  if (t.criticalMin !== undefined && value <= t.criticalMin) return "critical-low"
  if (t.criticalMax !== undefined && value >= t.criticalMax) return "critical-high"
  if (value < t.min) return "low"
  if (value > t.max) return "high"
  return "ok"
}

const isCritical = (c: Condition) => c === "critical-low" || c === "critical-high"

const METRIC_NAME: Record<MetricId, string> = { temperature: "Temperatura", humidity: "Humedad" }

function conditionChip(c: Condition): { label: string; tone: Tone } {
  if (c === "ok") return { label: "Nominal", tone: "ok" }
  if (c === "low") return { label: "Baja", tone: "warn" }
  if (c === "high") return { label: "Alta", tone: "warn" }
  return { label: "Crítica", tone: "crit" }
}

function rangeText(metric: MetricId): string {
  const t = TARGET[metric]
  return `${t.min}–${t.max} ${UNIT[metric]}`
}

// ── Time of the example crop ──────────────────────────────

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Local time of a scheduled crop event. Day 11 is today and can never be in the future. */
function cropEventTime(day: number, hour: number, minute: number, now: number): number {
  const date = new Date(startOfDay(now) - (DEMO_CROP_DAY - day) * DAY)
  date.setHours(hour, minute, 0, 0)
  const at = date.getTime()
  if (day < DEMO_CROP_DAY) return at
  return Math.min(at, Math.max(startOfDay(now), now - 3 * MINUTE))
}

// ── The world ─────────────────────────────────────────────

export interface DemoWorld {
  scenario: GrowDemoScenario
  environment: EnvironmentModel
  device: DeviceModel
  cultivation: Extract<CultivationModel, { status: "ready" }>
  /** Oldest → newest. */
  photos: PhotoModel[]
  /** Active alerts first, then newest first. */
  history: HistoryEntryModel[]
  insight: Extract<InsightModel, { status: "demo" }>
}

interface SensorState {
  /** Epoch ms of the newest sample, null when the device never reported. */
  last: number | null
  ageMs: number
  fresh: boolean
  stale: boolean
  offline: boolean
  /** Metrics the device is still reporting. */
  reporting: MetricId[]
  samples: number[]
  values: Partial<Record<MetricId, number>>
  conditions: Partial<Record<MetricId, Condition>>
}

function sensorState(scenario: GrowDemoScenario, now: number): SensorState {
  const minute = Math.floor(now / MINUTE) * MINUTE
  const epoch = epochOf(now)
  const last =
    scenario === "no-data" ? null : scenario === "stale" ? minute - STALE_AGE_MS : scenario === "offline" ? minute - OFFLINE_AGE_MS : minute
  if (last === null) {
    return { last, ageMs: 0, fresh: false, stale: false, offline: true, reporting: [], samples: [], values: {}, conditions: {} }
  }
  const samples = Array.from({ length: SAMPLE_COUNT }, (_, i) => last - (SAMPLE_COUNT - 1 - i) * SAMPLE_SPACING_MS)
  const humidityGone = scenario === "partial"
  const reporting: MetricId[] = humidityGone ? ["temperature"] : ["temperature", "humidity"]
  const values: Partial<Record<MetricId, number>> = {}
  const conditions: Partial<Record<MetricId, Condition>> = {}
  for (const metric of reporting) {
    values[metric] = valueAt(metric, last, scenario, epoch)
    conditions[metric] = conditionOf(metric, values[metric]!)
  }
  const ageMs = now - last
  return {
    last,
    ageMs,
    fresh: scenario !== "stale" && scenario !== "offline",
    stale: scenario === "stale",
    offline: scenario === "offline",
    reporting,
    samples,
    values,
    conditions,
  }
}

function buildMetric(metric: MetricId, scenario: GrowDemoScenario, state: SensorState, now: number): MetricModel {
  const epoch = epochOf(now)
  const humidityLostAt = epoch - DRIFT_STARTS_BEFORE_EPOCH_MS
  const times = state.samples.filter((t) => !(metric === "humidity" && scenario === "partial" && t >= humidityLostAt))
  const series = times.map((t) => valueAt(metric, t, scenario, epoch))
  const value = state.values[metric] ?? null
  const earlier = state.last === null ? null : valueAt(metric, state.last - 30 * MINUTE, scenario, epoch)
  const delta = value !== null && earlier !== null ? round1(value - earlier) : null
  const threshold = metric === "temperature" ? 0.3 : 1.5
  const trend = delta === null ? null : Math.abs(delta) < threshold ? "flat" : delta > 0 ? "up" : "down"
  const dimmed = state.stale || state.offline
  const condition = state.conditions[metric]
  return {
    id: metric,
    label: metric === "temperature" ? COPY.environment.temperature : COPY.environment.humidity,
    unit: UNIT[metric],
    value,
    decimals: 1,
    minSpan: metric === "temperature" ? 2 : 8,
    trend,
    delta,
    condition: condition && !dimmed ? conditionChip(condition) : null,
    series,
    times: times.map(clockLabel),
    target: { min: TARGET[metric].min, max: TARGET[metric].max },
  }
}

function ageText(ageMs: number): string {
  const minutes = Math.max(1, Math.round(ageMs / MINUTE))
  return `${minutes} min`
}

function overallOf(scenario: GrowDemoScenario, state: SensorState): NonNullable<Extract<EnvironmentModel, { status: "ready" }>["overall"]> {
  if (state.stale) return { label: "Datos atrasados", detail: `Última lectura hace ${ageText(state.ageMs)}`, tone: "warn", level: "nodata" }
  if (state.offline) return { label: "Sin conexión", detail: `Sin señal desde hace ${ageText(state.ageMs)}`, tone: "crit", level: "nodata" }
  const conditions = Object.values(state.conditions)
  if (conditions.some((c) => c !== undefined && isCritical(c))) {
    return { label: "Alerta", detail: "Un parámetro superó el umbral crítico", tone: "crit", level: "alert" }
  }
  if (conditions.some((c) => c !== undefined && c !== "ok")) {
    return { label: "Prealerta", detail: "Un parámetro está fuera del rango de ejemplo", tone: "watch", level: "prealert" }
  }
  if (scenario === "partial") {
    return { label: "Prealerta", detail: "Falta la lectura de humedad", tone: "watch", level: "prealert" }
  }
  // Simulated data never gets the calm "healthy" tone of a real stable reading.
  return { label: "Estable", detail: "Condiciones dentro del rango de ejemplo", tone: "sim", level: "stable" }
}

function actuatorsOf(state: SensorState): ActuatorModel[] {
  const dimmed = !state.fresh
  const humidity = state.conditions.humidity
  const temperature = state.conditions.temperature
  const humidifierOn = humidity === "low" || humidity === "critical-low"
  const fanOn = humidity === "high" || humidity === "critical-high" || temperature === "high" || temperature === "critical-high"
  return [
    { id: "fan", label: COPY.device.fan, state: dimmed ? "unknown" : fanOn ? "on" : "off" },
    { id: "humidifier", label: COPY.device.humidifier, state: dimmed ? "unknown" : humidifierOn ? "on" : "off" },
  ]
}

function deviceOf(scenario: GrowDemoScenario, state: SensorState): DeviceModel {
  const lastSampleAt = state.last === null ? null : new Date(state.last).toISOString()
  if (scenario === "no-data") {
    return { kind: "offline", label: "Sin conexión", provenance: "unavailable", tone: "muted", lastSampleAt, actuators: actuatorsOf(state) }
  }
  if (state.stale) return { kind: "stale", label: "Sin señal reciente", provenance: "simulated", tone: "warn", lastSampleAt, actuators: actuatorsOf(state) }
  if (state.offline) return { kind: "offline", label: "Sin conexión", provenance: "simulated", tone: "crit", lastSampleAt, actuators: actuatorsOf(state) }
  return { kind: "simulated", label: "Ejemplo", provenance: "simulated", tone: "sim", lastSampleAt, actuators: actuatorsOf(state) }
}

// ── Events derived from the curves ────────────────────────

interface EnvEvent {
  id: string
  at: number
  title: string
  detail?: string
  tone: Tone
  kind: "environment" | "device"
}

function environmentEvents(scenario: GrowDemoScenario, state: SensorState, now: number): EnvEvent[] {
  if (state.last === null) return []
  const epoch = epochOf(now)
  const driftStart = epoch - DRIFT_STARTS_BEFORE_EPOCH_MS
  const events: EnvEvent[] = []
  const drifting = Object.keys(DRIFT[scenario] ?? {}) as MetricId[]

  events.push({ id: "env-stable", at: driftStart - 70 * MINUTE, title: "Ambiente estable", detail: "Temperatura y humedad dentro del rango de ejemplo.", tone: "ok", kind: "environment" })

  for (const metric of drifting) {
    let outAt: number | null = null
    let criticalAt: number | null = null
    let outCondition: Condition = "ok"
    for (let t = driftStart; t <= driftStart + DRIFT_RAMP_MS + 30 * MINUTE; t += MINUTE) {
      const c = conditionOf(metric, valueAt(metric, t, scenario, epoch))
      if (outAt === null && c !== "ok") {
        outAt = t
        outCondition = c
      }
      if (criticalAt === null && isCritical(c)) criticalAt = t
    }
    const name = METRIC_NAME[metric]
    if (outAt !== null && outAt <= now) {
      const high = outCondition === "high" || outCondition === "critical-high"
      events.push({
        id: `env-${metric}-out`,
        at: outAt,
        title: `${name} ${high ? "alta" : "baja"}`,
        detail: `Salió del rango de ejemplo (${rangeText(metric)}).`,
        tone: "watch",
        kind: "environment",
      })
    }
    if (criticalAt !== null && criticalAt <= now && criticalAt !== outAt) {
      events.push({
        id: `env-${metric}-critical`,
        at: criticalAt,
        title: `${name} en nivel crítico`,
        detail: `Superó el umbral crítico de ejemplo.`,
        tone: "crit",
        kind: "environment",
      })
    }
  }

  if (scenario === "partial") {
    events.push({ id: "env-humidity-missing", at: driftStart, title: "Sin lectura de humedad", detail: "El sensor de humedad dejó de reportar.", tone: "muted", kind: "device" })
  }
  if (scenario === "stale") {
    events.push({ id: "dev-last", at: state.last, title: "Última lectura recibida", detail: `Hace ${ageText(state.ageMs)}.`, tone: "muted", kind: "device" })
  }
  if (scenario === "offline") {
    events.push({ id: "dev-last", at: state.last, title: "Última lectura recibida", tone: "muted", kind: "device" })
    events.push({ id: "dev-lost", at: state.last + SAMPLE_SPACING_MS, title: "Se perdió la señal del dispositivo", tone: "muted", kind: "device" })
  }
  return events.filter((event) => event.at <= now)
}

// ── Active alerts ─────────────────────────────────────────

function activeAlerts(scenario: GrowDemoScenario, state: SensorState): HistoryEntryModel[] {
  const alerts: HistoryEntryModel[] = []
  const base = { kind: "alert" as const, category: "alert" as HistoryCategory, at: null, simulated: true }

  if (state.stale) {
    alerts.push({ ...base, id: "alert-stale", tone: "warn", title: "Datos atrasados", detail: `La última lectura simulada tiene ${ageText(state.ageMs)}.` })
    return alerts
  }
  if (state.offline) {
    alerts.push({
      ...base,
      id: "alert-offline",
      tone: "crit",
      title: scenario === "no-data" ? "Sin lecturas" : "Sin conexión",
      detail: scenario === "no-data" ? "El dispositivo simulado no ha reportado datos." : `El dispositivo simulado no responde desde hace ${ageText(state.ageMs)}.`,
    })
    return alerts
  }
  for (const metric of ["temperature", "humidity"] as const) {
    const c = state.conditions[metric]
    const v = state.values[metric]
    if (c === undefined || v === undefined || c === "ok") continue
    const high = c === "high" || c === "critical-high"
    alerts.push({
      ...base,
      id: `alert-${metric}`,
      tone: isCritical(c) ? "crit" : "warn",
      title: `${METRIC_NAME[metric]} ${isCritical(c) ? "crítica" : high ? "alta" : "baja"}`,
      detail: `${num(v)} ${UNIT[metric]} · rango de ejemplo ${rangeText(metric)}`,
    })
  }
  if (scenario === "partial") {
    alerts.push({ ...base, id: "alert-humidity-missing", tone: "warn", title: "Sin lectura de humedad", detail: "No se puede evaluar la humedad sin ese sensor." })
  }
  return alerts
}

// ── Insight ───────────────────────────────────────────────

function insightOf(scenario: GrowDemoScenario, state: SensorState, overall: ReturnType<typeof overallOf>): Extract<InsightModel, { status: "demo" }> {
  const t = state.values.temperature
  const h = state.values.humidity
  const basis = [`Día ${DEMO_CROP_DAY} · ${stageLabel(DEMO_CROP_STAGE)}`]
  if (state.fresh) {
    if (t !== undefined) basis.push(`Temperatura ${num(t)} °C`)
    if (h !== undefined) basis.push(`Humedad ${num(h)} %`)
  }

  if (state.stale) {
    return { status: "demo", tone: "warn", headline: "Lecturas atrasadas", body: `Las últimas mediciones tienen ${ageText(state.ageMs)}. Hasta que lleguen datos nuevos no se evalúa el estado actual del ambiente.`, basis: [...basis, `Última lectura hace ${ageText(state.ageMs)}`] }
  }
  if (state.offline) {
    return { status: "demo", tone: "crit", headline: scenario === "no-data" ? "Sin lecturas" : "Sin conexión con el dispositivo", body: scenario === "no-data" ? "No hay mediciones, así que no se puede evaluar el ambiente del cultivo." : `El dispositivo simulado no responde desde hace ${ageText(state.ageMs)}. No se evalúa el ambiente hasta que vuelva la señal.`, basis }
  }
  if (scenario === "partial") {
    return { status: "demo", tone: "watch", headline: "Falta la lectura de humedad", body: "Sin el sensor de humedad solo se puede vigilar la temperatura. Conviene revisar la conexión del sensor.", basis }
  }
  const c = { temperature: state.conditions.temperature ?? "ok", humidity: state.conditions.humidity ?? "ok" }
  if (isCritical(c.humidity) || isCritical(c.temperature)) {
    return {
      status: "demo",
      tone: "crit",
      headline: "Condiciones críticas",
      body: "La humedad y la temperatura simuladas superaron los límites críticos del perfil de ejemplo. En un cultivo real convendría intervenir cuanto antes y revisar la cámara.",
      basis,
    }
  }
  if (c.humidity === "low") {
    return { status: "demo", tone: "watch", headline: "Humedad por debajo del rango", body: `La humedad bajó a ${num(h ?? 0)} %, por debajo del rango de ejemplo (${rangeText("humidity")}). En un cultivo real convendría revisar la humidificación y que la cámara esté bien cerrada.`, basis }
  }
  if (c.humidity === "high") {
    return { status: "demo", tone: "watch", headline: "Humedad por encima del rango", body: `La humedad subió a ${num(h ?? 0)} % (rango de ejemplo ${rangeText("humidity")}). En un cultivo real convendría ventilar para evitar condensación.`, basis }
  }
  if (c.temperature === "low") {
    return { status: "demo", tone: "watch", headline: "Temperatura por debajo del rango", body: `La temperatura bajó a ${num(t ?? 0)} °C (rango de ejemplo ${rangeText("temperature")}). Una temperatura baja suele ralentizar el avance del micelio.`, basis }
  }
  if (c.temperature === "high") {
    return { status: "demo", tone: "watch", headline: "Temperatura por encima del rango", body: `La temperatura subió a ${num(t ?? 0)} °C (rango de ejemplo ${rangeText("temperature")}). En un cultivo real convendría favorecer la ventilación.`, basis }
  }
  return {
    status: "demo",
    tone: overall.tone === "sim" ? "sim" : "ok",
    headline: "Colonización avanzando con normalidad",
    body: "Temperatura y humedad se mantienen dentro del rango de ejemplo para esta etapa. Las fotografías de los últimos días muestran el micelio cubriendo casi todo el sustrato.",
    basis,
  }
}

// ── Crop, photos and logbook ──────────────────────────────

function cropOf(now: number, log: LogEntryModel[]): Extract<CultivationModel, { status: "ready" }> {
  const profile = SAMPLE_PLEUROTUS_OSTREATUS_PROFILE
  const species = presentSpecies(profile)
  const started = DEMO_CROP_EVENTS.find((e) => e.id === "started")!
  const startedAt = cropEventTime(started.day, started.hour, started.minute, now)
  const confirmed = DEMO_CROP_EVENTS.find((e) => e.id === "stage-colonization")!
  const confirmedAt = cropEventTime(confirmed.day, confirmed.hour, confirmed.minute, now)
  const plan = resolveStagePlan(profile, DEMO_CROP_STAGE)
  const suggested = suggestStageByDays((now - startedAt) / DAY)
  const { steps, possibleChange } = buildStageSteps(plan, DEMO_CROP_STAGE, suggested)
  return {
    status: "ready",
    provenance: "simulated",
    name: "Hongo ostra",
    scientificName: species.scientificName,
    sampleProfile: species.isSample,
    startedAt: new Date(startedAt).toISOString(),
    day: DEMO_CROP_DAY,
    stage: {
      id: DEMO_CROP_STAGE,
      label: stageLabel(DEMO_CROP_STAGE),
      position: plan.indexOf(DEMO_CROP_STAGE) + 1,
      total: plan.length,
      confirmedAt: new Date(confirmedAt).toISOString(),
    },
    steps,
    possibleChange,
    log,
  }
}

function photosOf(now: number): PhotoModel[] {
  return DEMO_PHOTO_DAYS.map((day): PhotoModel => {
    const spec = DEMO_CROP_EVENTS.find((e) => e.photoDay === day)!
    return {
      id: `demo-d${day}`,
      url: demoPhotoUrl(day),
      thumbUrl: demoPhotoThumbUrl(day),
      heroUrl: demoHeroUrl(day),
      capturedAt: new Date(cropEventTime(spec.day, spec.hour, spec.minute, now)).toISOString(),
      kind: "demo",
      day,
      caption: DEMO_PHOTO_CAPTIONS[day],
    }
  })
}

function logOf(now: number, env: EnvEvent[]): LogEntryModel[] {
  const crop = DEMO_CROP_EVENTS.map((spec): LogEntryModel => ({
    id: `demo-${spec.id}`,
    at: new Date(cropEventTime(spec.day, spec.hour, spec.minute, now)).toISOString(),
    kind: spec.kind,
    title: spec.title,
    detail: spec.detail,
    tone: spec.tone,
    provenance: "simulated",
    photoId: spec.photoDay ? `demo-d${spec.photoDay}` : undefined,
    day: spec.day,
  }))
  const environment = env.map((event): LogEntryModel => ({
    id: `demo-${event.id}`,
    at: new Date(event.at).toISOString(),
    kind: event.kind,
    title: event.title,
    detail: event.detail,
    tone: event.tone,
    provenance: "simulated",
    day: DEMO_CROP_DAY - Math.round((startOfDay(now) - startOfDay(event.at)) / DAY),
  }))
  return [...crop, ...environment].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

function historyOf(alerts: HistoryEntryModel[], log: LogEntryModel[], photos: PhotoModel[]): HistoryEntryModel[] {
  const photoUrl = new Map(photos.map((photo) => [photo.id, photo.thumbUrl ?? photo.url]))
  const entries = toCropHistory(log).map((entry, index) => {
    const photoId = log[index].photoId
    return photoId ? { ...entry, photoUrl: photoUrl.get(photoId) } : entry
  })
  return [...alerts, ...entries]
}

// ── Public entry point ────────────────────────────────────

export function buildDemoWorld(scenario: GrowDemoScenario, nowMs: number): DemoWorld {
  const now = Math.floor(nowMs / MINUTE) * MINUTE
  const state = sensorState(scenario, now)

  const environment: EnvironmentModel =
    state.last === null
      ? { status: "waiting", reason: "disconnected", title: COPY.environment.noDeviceTitle, detail: COPY.environment.noDeviceDetail }
      : {
          status: "ready",
          provenance: "simulated",
          dimmed: state.stale || state.offline,
          metrics: (["temperature", "humidity"] as const).map((metric) => buildMetric(metric, scenario, state, now)),
          window: "demo",
          overall: overallOf(scenario, state),
        }

  const overall = overallOf(scenario, state)
  const events = environmentEvents(scenario, state, now)
  const log = logOf(now, events)
  const photos = photosOf(now)
  const alerts = activeAlerts(scenario, state)

  return {
    scenario,
    environment,
    device: deviceOf(scenario, state),
    cultivation: cropOf(now, log),
    photos,
    history: historyOf(alerts, log, photos),
    insight: insightOf(scenario, state, overall),
  }
}
