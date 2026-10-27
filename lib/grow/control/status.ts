import type { ControlContext } from "../intelligence/types"
import { describeTargets } from "./request"
import type { ControlEvent, HomeControl } from "./types"

/**
 * Plain-language status of the control loop. The golden rule: "Aplicado" is shown ONLY when the device itself reported
 * that version as applied. A config that is merely saved is "Guardada", never "Aplicada".
 */
export type ControlPhase = ControlContext["phase"]
export interface ControlStatus {
  phase: ControlPhase
  /** One short sentence about the configuration. */
  label: string
  /** One short sentence about what the controller is doing. */
  controller: string
  tone: "ok" | "info" | "warn" | "muted"
}

export const REPORT_STALE_MS = 3 * 60_000

const MODE_TEXT = { observation: "Observación", simulation: "Prueba (simulación)", assisted: "Asistido", automatic: "Automático" } as const
export const modeLabel = (mode: keyof typeof MODE_TEXT | null) => (mode ? MODE_TEXT[mode] : "—")

const ERROR_TEXT: Record<string, string> = {
  mode_not_supported: "este firmware solo admite observación y prueba",
  targets_missing: "faltan objetivos",
  temperature_out_of_envelope: "la temperatura sale de los límites seguros",
  humidity_out_of_envelope: "la humedad sale de los límites seguros",
  range_too_narrow: "un rango es demasiado estrecho",
  invalid_version: "versión inválida",
  stored_config_invalid: "la configuración guardada no es válida",
}
export const errorText = (code: string) => ERROR_TEXT[code] ?? code

export function describeControl(control: HomeControl | null | undefined, now: number): ControlStatus {
  const desired = control?.desired ?? null
  const reported = control?.reported ?? null
  if (!desired) return { phase: "none", label: "Sin objetivo definido.", controller: "MYKO observa y registra.", tone: "muted" }

  const reportAge = reported?.reportedAt ? now - Date.parse(reported.reportedAt) : Infinity
  const fresh = reportAge <= REPORT_STALE_MS
  const v = desired.version
  let phase: ControlPhase
  let label: string
  let tone: ControlStatus["tone"]
  if (!reported || !fresh) { phase = reported?.appliedVersion === v ? "applied" : "unreachable"; label = phase === "applied" ? `Aplicado por MYKO-001 (v${v}), sin comunicación reciente.` : `Guardada (v${v}). MYKO-001 no responde ahora.`; tone = "warn" }
  else if (reported.appliedVersion === v) { phase = "applied"; label = `Aplicado por MYKO-001 (v${v}).`; tone = "ok" }
  else if (reported.lastError && reported.receivedVersion === v) { phase = "rejected"; label = `MYKO-001 rechazó la configuración v${v}: ${errorText(reported.lastError)}.`; tone = "warn" }
  else if (reported.receivedVersion === v) { phase = "received"; label = `Configuración v${v} recibida por MYKO-001.`; tone = "info" }
  else { phase = "waiting"; label = `Guardada (v${v}). Esperando que MYKO-001 la reciba.`; tone = "info" }

  let controller = "MYKO observa y registra."
  if (phase === "applied" || phase === "received") {
    const state = reported?.controllerState
    if (reported?.sensorOk === false || state === "safe") controller = "Modo seguro: el sensor no es confiable y las salidas están apagadas."
    else if (state === "fault") controller = "Falla del controlador: salidas apagadas."
    else if (desired.mode === "simulation") controller = state === "holding" ? "Simulando: mantendría tus objetivos. No se activa ninguna salida eléctrica." : "Simulando: las condiciones están dentro de lo pedido. No se activa ninguna salida eléctrica."
    else if (desired.mode === "observation") controller = "Observando: no controla nada."
  } else if (phase === "waiting") controller = "Todavía no actúa con esta configuración."
  else if (phase === "rejected") controller = "Sigue con la última configuración válida."
  return { phase, label, controller, tone }
}

const ACTUATOR_ES: Record<string, string> = { humidifier: "humidificador", fan_exhaust: "ventilador de extracción", fan_intake: "ventilador de entrada" }
const REASON_ES: Record<string, string> = {
  below_band: "por debajo del rango", above_band: "por encima del rango", recovered: "volvió al rango", max_on_time: "tiempo máximo de encendido",
  sensor_invalid_safe_state: "sensor inválido (modo seguro)", mode_changed: "cambio de modo",
}
export const actuatorName = (id: string) => ACTUATOR_ES[id] ?? id
export const reasonName = (id: string) => REASON_ES[id] ?? id

/** Compact, allow-listed summary for the assistant (no ids, no hardware details). */
export function controlContext(control: HomeControl | null | undefined, now: number): ControlContext | null {
  if (!control) return null
  const status = describeControl(control, now)
  const actions = control.events.filter((e: ControlEvent) => e.kind === "actuation").slice(0, 5).map(e => ({
    at: e.at, actuator: String(e.detail.actuator ?? ""), command: e.detail.command === "on" ? "on" as const : "off" as const,
    reason: String(e.detail.reason ?? ""), value: typeof e.detail.value === "number" ? e.detail.value : null,
  }))
  return {
    phase: status.phase, label: status.label, controller: status.controller,
    mode: control.desired?.mode ?? null, version: control.desired?.version ?? null,
    targetsText: control.desired ? describeTargets(control.desired.targets) : null,
    appliedVersion: control.reported?.appliedVersion ?? null, lastError: control.reported?.lastError ?? null, actions,
  }
}
