import { ACTUATION_ENABLED } from "../intelligence/autonomy"

/**
 * Device control model: DESIRED state (what the owner wants, versioned), REPORTED state (what the device says it
 * received and applied) and an EVENT log. A config holds environmental targets, a mode and the actuators that are
 * allowed. It never carries low-level instructions: pins, durations and timings live in the firmware and cannot be
 * changed from here.
 */
export type ControlMode = "observation" | "simulation" | "assisted" | "automatic"
export const ALL_MODES: readonly ControlMode[] = ["observation", "simulation", "assisted", "automatic"]

/** Modes that may be stored today. Anything that could move a relay needs actuation to be enabled first. */
export const ALLOWED_MODES: readonly ControlMode[] = ACTUATION_ENABLED ? ALL_MODES : ["observation", "simulation"]

export type ActuatorId = "fan_intake" | "fan_exhaust" | "humidifier" | "light" | "heater"
export const ACTUATORS: readonly ActuatorId[] = ["fan_intake", "fan_exhaust", "humidifier", "light", "heater"]
export type Capabilities = Record<ActuatorId, boolean>
export const NO_CAPABILITIES: Capabilities = { fan_intake: false, fan_exhaust: false, humidifier: false, light: false, heater: false }

export interface Range { min: number; max: number }
export interface ControlTargets { temperature?: Range; humidity?: Range }

export interface DesiredConfig {
  version: number
  mode: ControlMode
  targets: ControlTargets
  capabilities: Capabilities
  note: string | null
  createdAt: string
}

export type ControllerState = "idle" | "holding" | "safe" | "fault"
export const EVENT_KINDS = ["boot", "config_received", "config_applied", "config_rejected", "decision", "actuation", "safety", "error"] as const
export type EventKind = (typeof EVENT_KINDS)[number]

export interface DeviceEventInput {
  key: string
  at: string
  kind: EventKind
  simulated: boolean
  version: number | null
  detail: Record<string, string | number | boolean>
}

/** What the firmware sends on every sync. */
export interface DeviceReport {
  bootId: string
  firmware: string
  uptimeSeconds: number
  /** Highest version the device has downloaded and stored. */
  receivedVersion: number | null
  /** Version the controller is actually running with. null until it applied one. */
  appliedVersion: number | null
  mode: ControlMode
  controller: { state: ControllerState; simulated: boolean; sensorOk: boolean }
  lastError: string | null
  events: DeviceEventInput[]
}

export interface ReportedState {
  receivedVersion: number | null
  appliedVersion: number | null
  mode: ControlMode | null
  controllerState: ControllerState | null
  simulated: boolean
  sensorOk: boolean | null
  lastError: string | null
  firmware: string | null
  reportedAt: string | null
}

export interface ControlEvent { at: string; kind: EventKind; simulated: boolean; version: number | null; detail: Record<string, unknown> }

/** What HOME reads (owner scoped through RLS). */
export interface HomeControl {
  desired: DesiredConfig | null
  reported: ReportedState | null
  events: ControlEvent[]
}
