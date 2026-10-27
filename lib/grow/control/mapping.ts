import { ALL_MODES, NO_CAPABILITIES, type Capabilities, type ControlEvent, type ControlMode, type ControllerState, type DesiredConfig, type EventKind, type ReportedState } from "./types"

/** Row → domain mappers. Defensive: unknown or malformed values become safe defaults, never trusted shapes. */
export const CONFIG_COLUMNS = "version, mode, targets, capabilities, note, created_at"

const obj = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const intOrNull = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : null)
const mode = (v: unknown): ControlMode | null => (typeof v === "string" && (ALL_MODES as readonly string[]).includes(v) ? (v as ControlMode) : null)

export function toDesired(row: Record<string, unknown>): DesiredConfig {
  const caps = obj(row.capabilities)
  return {
    version: Number(row.version), mode: mode(row.mode) ?? "observation", targets: obj(row.targets) as DesiredConfig["targets"],
    // Anything not explicitly true is false; unknown keys are dropped.
    capabilities: Object.fromEntries(Object.keys(NO_CAPABILITIES).map(k => [k, caps[k] === true])) as Capabilities,
    note: typeof row.note === "string" ? row.note : null, createdAt: String(row.created_at),
  }
}

const STATES: readonly ControllerState[] = ["idle", "holding", "safe", "fault"]

export function toReported(row: Record<string, unknown> | null): ReportedState | null {
  if (!row) return null
  const r = obj(row.reported_actuators)
  const controller = obj(r.controller)
  return {
    receivedVersion: intOrNull(r.receivedVersion), appliedVersion: intOrNull(r.appliedVersion), mode: mode(r.mode),
    controllerState: STATES.includes(controller.state as ControllerState) ? (controller.state as ControllerState) : null,
    simulated: controller.simulated !== false, sensorOk: typeof controller.sensorOk === "boolean" ? controller.sensorOk : null,
    lastError: typeof r.lastError === "string" ? r.lastError : null,
    firmware: typeof row.firmware_version === "string" ? row.firmware_version : null,
    reportedAt: typeof r.reportedAt === "string" ? r.reportedAt : typeof row.updated_at === "string" ? row.updated_at : null,
  }
}

export function toEvent(row: Record<string, unknown>): ControlEvent {
  return { at: String(row.occurred_at), kind: row.kind as EventKind, simulated: row.simulated !== false, version: intOrNull(row.config_version), detail: obj(row.detail) }
}
