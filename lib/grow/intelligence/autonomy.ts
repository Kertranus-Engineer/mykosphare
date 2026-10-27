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
  /** A reading older than this is treated as a sensor failure. */
  maxSensorAgeMs: number
  /** The hardware must confirm a command within this time or the controller falls back to the safe state. */
  ackTimeoutMs: number
  /** After a reboot the actuator stays off until this many valid readings arrived. */
  bootValidReadings: number
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
  if (!(policy.maxSensorAgeMs > 0)) errors.push("maxSensorAgeMs must be positive")
  if (!(policy.ackTimeoutMs > 0)) errors.push("ackTimeoutMs must be positive")
  if (!(Number.isInteger(policy.bootValidReadings) && policy.bootValidReadings >= 1)) errors.push("bootValidReadings must be at least 1")
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

/**
 * Hard envelope: limits no one can exceed through software, a person's confirmation included. The firmware carries
 * its own copy; anything outside it is refused on the device regardless of what the app says.
 */
export const POLICY_ENVELOPE = {
  temperature: { min: 5, max: 35 },
  humidity: { min: 20, max: 98 },
  maxContinuousOnMs: 30 * 60_000,
  manualOverrideMaxMs: 2 * 3_600_000,
  minHysteresis: { temperature: 0.5, humidity: 2 },
} as const

export function checkPolicyEnvelope(policy: ActuatorSafetyPolicy): string[] {
  const errors = validateActuatorPolicy(policy)
  const range = POLICY_ENVELOPE[policy.metric]
  if (policy.band.min < range.min || policy.band.max > range.max) errors.push(`band must stay within ${range.min}–${range.max}`)
  if (policy.maxContinuousOnMs > POLICY_ENVELOPE.maxContinuousOnMs) errors.push("maxContinuousOnMs exceeds the hard limit")
  if (policy.manualOverrideMaxMs > POLICY_ENVELOPE.manualOverrideMaxMs) errors.push("manualOverrideMaxMs exceeds the hard limit")
  if (policy.hysteresis < POLICY_ENVELOPE.minHysteresis[policy.metric]) errors.push("hysteresis is below the minimum that prevents chattering")
  if (policy.onSensorInvalid !== "off" || policy.onReboot !== "off_until_valid_reading" || policy.recordEveryActuation !== true) errors.push("safety behaviours cannot be changed")
  return errors
}

/** Whoever suggests a change (a person, the rules, or a language model), the result is only a proposal. */
export interface PolicyChangeProposal {
  kind: "policy_change_proposal"
  proposedBy: "person" | "rules" | "model"
  policy: ActuatorSafetyPolicy
  rationale: string
  status: "proposed"
  requiresHumanApproval: true
}

export function proposePolicyChange(proposedBy: PolicyChangeProposal["proposedBy"], policy: ActuatorSafetyPolicy, rationale: string): PolicyChangeProposal {
  return { kind: "policy_change_proposal", proposedBy, policy, rationale, status: "proposed", requiresHumanApproval: true }
}

export type PolicyApplication = { ok: true; policy: ActuatorSafetyPolicy } | { ok: false; errors: string[] }

/**
 * The only way a policy changes: a person confirms a proposal that is inside the hard envelope. A model cannot
 * confirm (the type admits only "person"), cannot skip the envelope, and cannot touch the safety behaviours.
 */
export function applyPolicyChange(proposal: PolicyChangeProposal, confirmation: { by: "person"; at: string }): PolicyApplication {
  if (confirmation.by !== "person") return { ok: false, errors: ["only a person can confirm a policy change"] }
  const errors = checkPolicyEnvelope(proposal.policy)
  return errors.length ? { ok: false, errors } : { ok: true, policy: proposal.policy }
}

/**
 * Whether automation could ever be offered for this cultivation. Today it is never: the firmware is sensor-only.
 * The reasons are shown to the person so they know what is missing.
 */
export function automationEligibility(input: { actuatorsInstalled: boolean; targetsConfirmed: boolean; validation: "sample" | "experimental" | "validated"; rangesSource: "profile" | "owner" }): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (!ACTUATION_ENABLED) reasons.push("El firmware actual es solo sensor.")
  if (!input.actuatorsInstalled) reasons.push("No hay actuadores instalados y verificados.")
  if (!input.targetsConfirmed) reasons.push("Los rangos objetivo no están confirmados por ti.")
  if (input.validation !== "validated" && input.rangesSource !== "owner") reasons.push("El perfil de especie es de ejemplo y no está validado.")
  return { eligible: reasons.length === 0, reasons }
}
