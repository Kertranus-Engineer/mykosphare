import { ACTUATION_ENABLED, decideActuator, validateActuatorPolicy, type ActuationRecord, type ActuatorSafetyPolicy } from "./autonomy"

/**
 * LOCAL CONTROLLER — reference specification for the next stage (the ESP32 firmware will implement the same rules).
 * Pure and deterministic: no network, no clock of its own, no model. It runs on the device, so it keeps working
 * when the internet is down, and it is the ONLY thing that may ever command a relay.
 *
 * Not wired to any hardware: ACTUATION_ENABLED is false and nothing imports this to drive a pin.
 */
export interface ControllerState {
  actuator: "on" | "off"
  /** When the actuator last changed state (epoch ms). */
  changedAtMs: number
  bootedAtMs: number
  validReadingsSinceBoot: number
  /** A command was issued and the hardware has not confirmed it yet. */
  pendingAck: { command: "on" | "off"; sentAtMs: number } | null
  /** Latched after a failed confirmation. Needs a person to clear it; blocks "on" meanwhile. */
  faulted: boolean
  sensorFaultLogged: boolean
  commLossLogged: boolean
}

export interface ControllerInput {
  nowMs: number
  /** Latest valid reading, or null when the sensor failed. */
  value: number | null
  /** Age of that reading. */
  valueAgeMs: number
  /** Hardware feedback for a previous command (relay/current sensor), if any arrived. */
  ack: "on" | "off" | null
  /** Internet/cloud reachability. The controller must not depend on it. */
  commOk: boolean
  manualOverride: "on" | "off" | null
  manualOverrideSinceMs: number
  /** A person cleared a latched fault. */
  faultCleared?: boolean
}

export interface ControllerResult { state: ControllerState; command: "on" | "off" | "hold"; records: ActuationRecord[] }

/** Boot (or reboot): everything off, nothing assumed about the world before the reboot. */
export function bootState(nowMs: number): ControllerState {
  return { actuator: "off", changedAtMs: nowMs, bootedAtMs: nowMs, validReadingsSinceBoot: 0, pendingAck: null, faulted: false, sensorFaultLogged: false, commLossLogged: false }
}

export interface ControllerOptions {
  /** Defaults to ACTUATION_ENABLED (false). Tests of the specification pass true to exercise the "on" paths off-device. */
  actuationEnabled?: boolean
}

export function stepController(policy: ActuatorSafetyPolicy, previous: ControllerState, input: ControllerInput, options: ControllerOptions = {}): ControllerResult {
  const errors = validateActuatorPolicy(policy)
  if (errors.length) throw new Error(`invalid actuator policy: ${errors.join("; ")}`)
  const enabled = options.actuationEnabled ?? ACTUATION_ENABLED
  const at = new Date(input.nowMs).toISOString()
  const records: ActuationRecord[] = []
  let state: ControllerState = { ...previous }
  const record = (command: "on" | "off", reason: string, confirmedByHardware: boolean, initiatedBy: ActuationRecord["initiatedBy"] = "local_policy") =>
    records.push({ at, actuator: policy.actuator, command, reason, initiatedBy, confirmedByHardware })
  const issue = (command: "on" | "off", reason: string, initiatedBy: ActuationRecord["initiatedBy"] = "local_policy"): ControllerResult => {
    record(command, reason, false, initiatedBy)
    state = { ...state, actuator: command, changedAtMs: input.nowMs, pendingAck: { command, sentAtMs: input.nowMs } }
    return { state, command, records }
  }

  if (input.faultCleared && state.faulted) state = { ...state, faulted: false, pendingAck: null }

  // 1) Hardware confirmation: a command is only "done" when the hardware says so.
  if (state.pendingAck) {
    if (input.ack === state.pendingAck.command) {
      record(state.pendingAck.command, "hardware_confirmed", true)
      state = { ...state, pendingAck: null }
    } else if (input.nowMs - state.pendingAck.sentAtMs >= policy.ackTimeoutMs) {
      record("off", "ack_timeout_fault", false)
      state = { ...state, actuator: "off", changedAtMs: input.nowMs, pendingAck: null, faulted: true }
      return { state, command: "off", records }
    }
  }

  // 2) Sensor health: no valid, fresh reading means the safe state, whatever the internet or anyone says.
  const sensorOk = input.value !== null && Number.isFinite(input.value) && input.valueAgeMs <= policy.maxSensorAgeMs
  if (!sensorOk) {
    state = { ...state, validReadingsSinceBoot: 0 }
    if (state.actuator === "on") return issue("off", "sensor_invalid_safe_state")
    if (!state.sensorFaultLogged) { record("off", "sensor_invalid_safe_state", true); state = { ...state, sensorFaultLogged: true } }
    return { state, command: "off", records }
  }
  state = { ...state, validReadingsSinceBoot: state.validReadingsSinceBoot + 1, sensorFaultLogged: false }

  // 3) Internet loss is not a fault by itself: keep controlling locally, unless the policy says to go off.
  state = { ...state, commLossLogged: !input.commOk }
  if (!input.commOk && policy.onCommunicationLoss === "off" && state.actuator === "on") return issue("off", "communication_loss_safe_state")

  // 4) After a reboot nothing turns on until enough valid readings and the minimum off time have passed.
  const warm = state.validReadingsSinceBoot >= policy.bootValidReadings && input.nowMs - state.bootedAtMs >= policy.minOffMs
  const decision = decideActuator(policy, {
    value: input.value, state: state.actuator, inStateMs: input.nowMs - state.changedAtMs,
    manualOverride: input.manualOverride, manualOverrideAgeMs: input.nowMs - input.manualOverrideSinceMs,
  })
  if (decision.command === "hold" || decision.command === state.actuator) return { state, command: "hold", records }
  if (decision.command === "on" && (!warm || state.faulted || !enabled)) return { state, command: "hold", records }
  return issue(decision.command, decision.reason, decision.reason === "manual_override" ? "person" : "local_policy")
}
