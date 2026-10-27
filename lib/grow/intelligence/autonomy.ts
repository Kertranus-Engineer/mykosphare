/**
 * AUTONOMY MODEL — models and a reference decision function only. NOTHING here talks to hardware.
 *
 * Modes:
 *   monitor   MYKOSPHARE observes and records. No physical action. (the only mode available today)
 *   assisted  MYKOSPHARE proposes a change; a person confirms it. Not available yet.
 *   automatic The local controller keeps configured conditions with actuators. Not available yet.
 *
 * Invariants for any future actuation path:
 *   AI/recommendations -> ActionProposal (inert) -> person -> policy + safety checks -> controller.
 *   The controller enforces ActuatorSafetyPolicy locally, works without internet, and falls to a safe state.
 */

export type AutonomyMode = "monitor" | "assisted" | "automatic"

/** Flipped only by shipping actuator-capable firmware AND wiring; today the firmware is sensor-only. */
export const ACTUATION_ENABLED = false as const

export const AUTONOMY_MODES: Record<AutonomyMode, { label: string; description: string; available: boolean; unavailableReason?: string }> = {
  monitor: { label: "Monitoreo", description: "MYKOSPHARE observa y registra. No ejecuta acciones físicas.", available: true },
  assisted: { label: "Asistido", description: "MYKOSPHARE propone un cambio y tú lo confirmas.", available: false, unavailableReason: "Requiere actuadores conectados." },
  automatic: { label: "Automático", description: "El controlador local mantiene las condiciones que configuraste.", available: false, unavailableReason: "Requiere actuadores y firmware de control." },
}

export function canExecutePhysicalAction(mode: AutonomyMode): boolean {
  return ACTUATION_ENABLED && mode !== "monitor" && AUTONOMY_MODES[mode].available
}

export type ActuatorKind = "humidifier" | "fan" | "heater" | "light"

export interface ActuatorSafetyPolicy {
  actuator: ActuatorKind
  /** "raise" actuators act when the metric is BELOW the band (humidifier, heater); "lower" when above (fan). */
  direction: "raise" | "lower"
  metric: "temperature" | "humidity"
  /** Hard operating band. The controller never acts outside these limits' meaning, and never beyond maxOn. */
  band: { min: number; max: number }
  hysteresis: number
  maxContinuousOnMs: number
  minOffMs: number
  /** Longest a manual override may hold before automation resumes. */
  manualOverrideMaxMs: number
  onSensorInvalid: "off"
  onCommunicationLoss: "continue_locally" | "off"
  onReboot: "off_until_valid_reading"
  recordEveryActuation: true
}

export function validateActuatorPolicy(policy: ActuatorSafetyPolicy): string[] {
  const errors: string[] = []
  if (!(policy.band.min < policy.band.max)) errors.push("band.min must be below band.max")
  if (!(policy.hysteresis > 0 && policy.hysteresis < (policy.band.max - policy.band.min))) errors.push("hysteresis must be positive and smaller than the band")
  if (!(policy.maxContinuousOnMs > 0)) errors.push("maxContinuousOnMs must be positive")
  if (!(policy.minOffMs >= 0)) errors.push("minOffMs cannot be negative")
  if (!(policy.manualOverrideMaxMs > 0)) errors.push("manualOverrideMaxMs must be positive")
  return errors
}

export interface ActuatorInput {
  /** null = no valid reading (sensor fault, boot, or stale). */
  value: number | null
  state: "on" | "off"
  /** Time spent in the current state. */
  inStateMs: number
  manualOverride: "on" | "off" | null
  manualOverrideAgeMs: number
}
export type ActuatorDecision = { command: "on" | "off" | "hold"; reason: string }

/**
 * Reference rules for the future local controller. Safety checks come first; the setpoint logic uses
 * hysteresis so the actuator does not chatter. Pure and deterministic, therefore testable off-device.
 */
export function decideActuator(policy: ActuatorSafetyPolicy, input: ActuatorInput): ActuatorDecision {
  if (input.value === null || !Number.isFinite(input.value)) return { command: "off", reason: "sensor_invalid_safe_state" }
  if (input.state === "on" && input.inStateMs >= policy.maxContinuousOnMs) return { command: "off", reason: "max_on_time" }
  if (input.manualOverride && input.manualOverrideAgeMs < policy.manualOverrideMaxMs) {
    return { command: input.manualOverride, reason: "manual_override" }
  }
  const { min, max } = policy.band
  if (policy.direction === "raise") {
    if (input.state === "off" && input.value < min) return input.inStateMs >= policy.minOffMs ? { command: "on", reason: "below_band" } : { command: "hold", reason: "min_off_time" }
    if (input.state === "on" && input.value >= min + policy.hysteresis) return { command: "off", reason: "recovered_with_hysteresis" }
    if (input.state === "on" && input.value > max) return { command: "off", reason: "above_band" }
  } else {
    if (input.state === "off" && input.value > max) return input.inStateMs >= policy.minOffMs ? { command: "on", reason: "above_band" } : { command: "hold", reason: "min_off_time" }
    if (input.state === "on" && input.value <= max - policy.hysteresis) return { command: "off", reason: "recovered_with_hysteresis" }
    if (input.state === "on" && input.value < min) return { command: "off", reason: "below_band" }
  }
  return { command: "hold", reason: "within_band" }
}

/** A suggestion for a person to confirm. Inert by construction. */
export interface ActionProposal {
  kind: "action_proposal"
  intent: string
  rationale: string
  status: "proposed"
  requiresHumanApproval: true
}

/** What a future controller would log; `confirmedByHardware` must come from a device ACK, never from the UI. */
export interface ActuationRecord {
  at: string
  actuator: ActuatorKind
  command: "on" | "off"
  reason: string
  initiatedBy: "local_policy" | "person"
  confirmedByHardware: boolean
}
