import { ACTUATION_ENABLED, POLICY_ENVELOPE } from "../intelligence/autonomy"
import {
  ALLOWED_MODES, ALL_MODES, EVENT_KINDS, NO_CAPABILITIES,
  type Capabilities, type ControlMode, type ControlTargets, type ControllerState, type DeviceEventInput, type DeviceReport, type Range,
} from "./types"
/**
 * Strict validation for both directions. Unknown fields are rejected, numbers must be finite and inside the hard
 * envelope, strings are bounded. Nothing here accepts a command: only targets, a mode and a closed set of capabilities.
 */
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const onlyKeys = (o: Record<string, unknown>, allowed: readonly string[]) => Object.keys(o).find(k => !allowed.includes(k))

const MIN_WIDTH = { temperature: 1, humidity: 4 } as const

function parseRange(metric: "temperature" | "humidity", value: unknown): Parsed<Range> {
  if (!isObject(value) || onlyKeys(value, ["min", "max"])) return fail(`${metric} must be { min, max }`)
  const { min, max } = value
  if (typeof min !== "number" || typeof max !== "number" || !Number.isFinite(min) || !Number.isFinite(max)) return fail(`${metric} min and max must be numbers`)
  const lo = Math.round(min * 10) / 10
  const hi = Math.round(max * 10) / 10
  const limits = POLICY_ENVELOPE[metric]
  if (lo < limits.min || hi > limits.max) return fail(`${metric} must stay between ${limits.min} and ${limits.max}`)
  if (hi - lo < MIN_WIDTH[metric]) return fail(`${metric} range must be at least ${MIN_WIDTH[metric]} wide`)
  return { ok: true, value: { min: lo, max: hi } }
}

export function parseTargets(value: unknown): Parsed<ControlTargets> {
  if (!isObject(value) || onlyKeys(value, ["temperature", "humidity"])) return fail("targets may only contain temperature and humidity")
  const targets: ControlTargets = {}
  for (const metric of ["temperature", "humidity"] as const) {
    if (value[metric] === undefined) continue
    const range = parseRange(metric, value[metric])
    if (!range.ok) return range
    targets[metric] = range.value
  }
  if (!targets.temperature && !targets.humidity) return fail("at least one target is required")
  return { ok: true, value: targets }
}

export interface OwnerConfigInput { mode: ControlMode; targets: ControlTargets; capabilities: Capabilities; note: string | null }

/** Owner request (from MYKO Home, after the person confirmed the exact values). */
export function parseOwnerConfig(body: unknown): Parsed<OwnerConfigInput> {
  if (!isObject(body)) return fail("body must be an object")
  const extra = onlyKeys(body, ["mode", "targets", "note"])
  if (extra) return fail(`unsupported field: ${extra}`)
  const mode = body.mode
  if (typeof mode !== "string" || !(ALL_MODES as readonly string[]).includes(mode)) return fail("invalid mode")
  if (!(ALLOWED_MODES as readonly string[]).includes(mode)) return fail("actuation_not_enabled")
  const targets = parseTargets(body.targets)
  if (!targets.ok) return targets
  let note: string | null = null
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== "string" || body.note.length > 200) return fail("invalid note")
    note = body.note.trim() || null
  }
  // Capabilities are decided here, not requested: while actuation is disabled nothing may be allowed.
  return { ok: true, value: { mode: mode as ControlMode, targets: targets.value, capabilities: { ...NO_CAPABILITIES }, note } }
}

const CONTROLLER_STATES: readonly ControllerState[] = ["idle", "holding", "safe", "fault"]
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/
const version = (v: unknown): v is number | null => v === null || (Number.isInteger(v) && (v as number) > 0 && (v as number) < 1_000_000)

function parseEvent(raw: unknown, now: number): Parsed<DeviceEventInput> {
  if (!isObject(raw) || onlyKeys(raw, ["key", "at", "kind", "simulated", "version", "detail"])) return fail("invalid event")
  const { key, at, kind, simulated, detail } = raw
  if (typeof key !== "string" || key.length < 1 || key.length > 64 || !/^[A-Za-z0-9:_-]+$/.test(key)) return fail("invalid event key")
  if (typeof at !== "string" || !ISO.test(at)) return fail("invalid event time")
  const t = Date.parse(at)
  if (!Number.isFinite(t) || t > now + 60_000 || t < now - 7 * 86_400_000) return fail("event time outside the accepted window")
  if (typeof kind !== "string" || !(EVENT_KINDS as readonly string[]).includes(kind)) return fail("invalid event kind")
  if (typeof simulated !== "boolean") return fail("invalid simulated flag")
  if (!version(raw.version ?? null)) return fail("invalid event version")
  const clean: Record<string, string | number | boolean> = {}
  if (detail !== undefined) {
    if (!isObject(detail) || Object.keys(detail).length > 8) return fail("invalid event detail")
    for (const [k, v] of Object.entries(detail)) {
      if (!/^[a-z_]{1,24}$/.test(k)) return fail("invalid event detail key")
      if (typeof v === "string") { if (v.length > 80) return fail("event detail too long"); clean[k] = v }
      else if (typeof v === "number" && Number.isFinite(v)) clean[k] = v
      else if (typeof v === "boolean") clean[k] = v
      else return fail("invalid event detail value")
    }
  }
  // While actuation is disabled nothing can be a real actuation, whatever the device claims.
  return { ok: true, value: { key, at: new Date(t).toISOString(), kind: kind as DeviceEventInput["kind"], simulated: ACTUATION_ENABLED ? simulated : true, version: (raw.version ?? null) as number | null, detail: clean } }
}

export const MAX_EVENTS_PER_SYNC = 20
export const MAX_SYNC_BYTES = 6144

/** Device report (firmware → server). */
export function parseDeviceReport(body: unknown, now: Date = new Date()): Parsed<DeviceReport> {
  if (!isObject(body)) return fail("body must be an object")
  const extra = onlyKeys(body, ["bootId", "firmware", "uptimeSeconds", "receivedVersion", "appliedVersion", "mode", "controller", "lastError", "events"])
  if (extra) return fail(`unsupported field: ${extra}`)
  const { bootId, firmware, uptimeSeconds, mode, controller, lastError, events } = body
  if (typeof bootId !== "string" || !/^[A-Za-z0-9_-]{1,32}$/.test(bootId)) return fail("invalid bootId")
  if (typeof firmware !== "string" || !/^[A-Za-z0-9._+-]{1,40}$/.test(firmware)) return fail("invalid firmware")
  if (typeof uptimeSeconds !== "number" || !Number.isInteger(uptimeSeconds) || uptimeSeconds < 0 || uptimeSeconds > 10 * 365 * 86_400) return fail("invalid uptimeSeconds")
  if (!version(body.receivedVersion ?? null) || !version(body.appliedVersion ?? null)) return fail("invalid version")
  if (typeof mode !== "string" || !(ALL_MODES as readonly string[]).includes(mode)) return fail("invalid mode")
  if (!isObject(controller) || onlyKeys(controller, ["state", "simulated", "sensorOk"])) return fail("invalid controller")
  if (typeof controller.state !== "string" || !(CONTROLLER_STATES as readonly string[]).includes(controller.state)) return fail("invalid controller state")
  if (typeof controller.simulated !== "boolean" || typeof controller.sensorOk !== "boolean") return fail("invalid controller flags")
  if (lastError !== undefined && lastError !== null && (typeof lastError !== "string" || lastError.length > 120)) return fail("invalid lastError")
  const list = events === undefined ? [] : events
  if (!Array.isArray(list) || list.length > MAX_EVENTS_PER_SYNC) return fail("too many events")
  const parsedEvents: DeviceEventInput[] = []
  for (const raw of list) {
    const parsed = parseEvent(raw, now.getTime())
    if (!parsed.ok) return parsed
    parsedEvents.push(parsed.value)
  }
  return {
    ok: true,
    value: {
      bootId, firmware, uptimeSeconds, receivedVersion: (body.receivedVersion ?? null) as number | null, appliedVersion: (body.appliedVersion ?? null) as number | null,
      mode: mode as ControlMode,
      controller: { state: controller.state as ControllerState, simulated: ACTUATION_ENABLED ? controller.simulated : true, sensorOk: controller.sensorOk },
      lastError: (lastError ?? null) as string | null, events: parsedEvents,
    },
  }
}

