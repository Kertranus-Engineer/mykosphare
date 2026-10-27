import { describe, expect, it } from "vitest"
import {
  ACTUATION_ENABLED, POLICY_ENVELOPE, applyPolicyChange, automationEligibility, bootState, checkPolicyEnvelope, proposePolicyChange,
  stepController, type ActuatorSafetyPolicy, type ControllerInput, type ControllerState,
} from "../index"

const humidifier: ActuatorSafetyPolicy = {
  actuator: "humidifier", direction: "raise", metric: "humidity", band: { min: 60, max: 75 }, hysteresis: 5,
  maxContinuousOnMs: 10 * 60_000, minOffMs: 60_000, manualOverrideMaxMs: 30 * 60_000, maxSensorAgeMs: 30_000, ackTimeoutMs: 5_000, bootValidReadings: 2,
  onSensorInvalid: "off", onCommunicationLoss: "continue_locally", onReboot: "off_until_valid_reading", recordEveryActuation: true,
}
const T0 = 1_000_000_000_000
const on = { actuationEnabled: true }
const input = (over: Partial<ControllerInput> = {}): ControllerInput => ({ nowMs: T0, value: 65, valueAgeMs: 1_000, ack: null, commOk: true, manualOverride: null, manualOverrideSinceMs: 0, ...over })

/** Feeds a sequence of inputs to the controller and returns every state/command/record. */
function run(policy: ActuatorSafetyPolicy, start: ControllerState, steps: Partial<ControllerInput>[], options: { actuationEnabled?: boolean } = on) {
  let state = start
  return steps.map(step => {
    const result = stepController(policy, state, input(step), options)
    state = result.state
    return result
  })
}

describe("local controller specification", () => {
  it("never commands anything with the shipped setting (actuation disabled)", () => {
    expect(ACTUATION_ENABLED).toBe(false)
    const out = run(humidifier, bootState(T0), [{ nowMs: T0 + 200_000, value: 40 }, { nowMs: T0 + 230_000, value: 40 }, { nowMs: T0 + 260_000, value: 40 }], {})
    expect(out.every(r => r.command !== "on")).toBe(true)
  })

  it("after a reboot stays off until enough valid readings and the minimum off time have passed", () => {
    const out = run(humidifier, bootState(T0), [
      { nowMs: T0 + 10_000, value: 40 }, // first valid reading, too early
      { nowMs: T0 + 40_000, value: 40 }, // second valid reading, minimum off time not over
      { nowMs: T0 + 70_000, value: 40 }, // warm: now it may act
    ])
    expect(out.map(r => r.command)).toEqual(["hold", "hold", "on"])
    expect(out[2]?.records[0]).toMatchObject({ command: "on", reason: "below_band", confirmedByHardware: false, initiatedBy: "local_policy" })
  })

  it("keeps controlling locally when the internet is lost, and does not depend on the cloud", () => {
    const warmUp = run(humidifier, bootState(T0), [{ nowMs: T0 + 30_000 }, { nowMs: T0 + 70_000, value: 40, commOk: false }])
    expect(warmUp[1]?.command).toBe("on")
    expect(warmUp[1]?.state.commLossLogged).toBe(true)
    const [off] = run({ ...humidifier, onCommunicationLoss: "off" }, warmUp[1]!.state, [{ nowMs: T0 + 80_000, value: 50, commOk: false, ack: "on" }])
    expect(off?.command).toBe("off")
    expect(off?.records.some(r => r.reason === "communication_loss_safe_state")).toBe(true)
  })

  it("goes to the safe state on a failed or stale sensor and records it once", () => {
    const warm = run(humidifier, bootState(T0), [{ nowMs: T0 + 30_000 }, { nowMs: T0 + 70_000, value: 40 }, { nowMs: T0 + 71_000, value: 40, ack: "on" }])
    expect(warm[2]?.state.actuator).toBe("on")
    const failed = run(humidifier, warm[2]!.state, [
      { nowMs: T0 + 80_000, value: null },
      { nowMs: T0 + 90_000, value: null },
      { nowMs: T0 + 100_000, value: 40, valueAgeMs: 120_000 }, // stale counts as failed
    ])
    expect(failed[0]).toMatchObject({ command: "off" })
    expect(failed[0]?.records[0]).toMatchObject({ reason: "sensor_invalid_safe_state" })
    expect(failed[0]?.state.validReadingsSinceBoot).toBe(0)
    expect(failed[1]?.records.length).toBeLessThanOrEqual(1)
    expect(failed[2]?.command).toBe("off")
  })

  it("enforces hysteresis and the maximum continuous on time", () => {
    const start = run(humidifier, bootState(T0), [{ nowMs: T0 + 30_000 }, { nowMs: T0 + 70_000, value: 40 }, { nowMs: T0 + 71_000, value: 62, ack: "on" }])
    expect(start[2]?.command).toBe("hold") // 62 is inside the hysteresis zone while on
    const recovered = run(humidifier, start[2]!.state, [{ nowMs: T0 + 100_000, value: 66 }])
    expect(recovered[0]?.command).toBe("off")
    const stuck = run(humidifier, start[2]!.state, [{ nowMs: T0 + 70_000 + 11 * 60_000, value: 50 }])
    expect(stuck[0]).toMatchObject({ command: "off" })
    expect(stuck[0]?.records[0]?.reason).toBe("max_on_time")
  })

  it("requires hardware confirmation: a command that is never acknowledged latches a fault and blocks turning on", () => {
    const [issued] = run(humidifier, bootState(T0), [{ nowMs: T0 + 70_000, value: 40 }].map((s, i) => ({ ...s, nowMs: s.nowMs + i }))
      .flatMap(s => [{ nowMs: T0 + 30_000 }, s]))
      .slice(-1)
    expect(issued?.command).toBe("on")
    const timeout = run(humidifier, issued!.state, [{ nowMs: T0 + 70_000 + 6_000, value: 40, ack: null }])
    expect(timeout[0]?.command).toBe("off")
    expect(timeout[0]?.records[0]).toMatchObject({ reason: "ack_timeout_fault", confirmedByHardware: false })
    expect(timeout[0]?.state.faulted).toBe(true)
    const blocked = run(humidifier, timeout[0]!.state, [{ nowMs: T0 + 400_000, value: 40 }, { nowMs: T0 + 430_000, value: 40 }])
    expect(blocked.every(r => r.command !== "on")).toBe(true)
    const cleared = run(humidifier, timeout[0]!.state, [{ nowMs: T0 + 400_000, value: 40, faultCleared: true }])
    expect(cleared[0]?.command).toBe("on")
  })

  it("marks a command confirmed only when the hardware says so", () => {
    const warm = run(humidifier, bootState(T0), [{ nowMs: T0 + 30_000 }, { nowMs: T0 + 70_000, value: 40 }])
    const [confirmed] = run(humidifier, warm[1]!.state, [{ nowMs: T0 + 72_000, value: 45, ack: "on" }])
    expect(confirmed?.records[0]).toMatchObject({ reason: "hardware_confirmed", confirmedByHardware: true })
    expect(confirmed?.state.pendingAck).toBeNull()
  })

  it("rejects an invalid policy instead of running with it", () => {
    expect(() => stepController({ ...humidifier, hysteresis: 100 }, bootState(T0), input())).toThrow(/invalid actuator policy/)
  })
})

describe("policy changes: models propose, people decide, the envelope is fixed", () => {
  const raised: ActuatorSafetyPolicy = { ...humidifier, band: { min: 70, max: 80 } }

  it("a model can only create an inert proposal", () => {
    const proposal = proposePolicyChange("model", raised, "La humedad objetivo parece baja")
    expect(proposal).toMatchObject({ status: "proposed", requiresHumanApproval: true, proposedBy: "model" })
  })

  it("applies only with a person's confirmation and inside the hard limits", () => {
    const ok = applyPolicyChange(proposePolicyChange("model", raised, "x"), { by: "person", at: "2026-10-27T12:00:00Z" })
    expect(ok).toEqual({ ok: true, policy: raised })
    const forged = applyPolicyChange(proposePolicyChange("model", raised, "x"), { by: "model" as unknown as "person", at: "now" })
    expect(forged).toMatchObject({ ok: false })
  })

  it.each([
    ["a band outside the physical envelope", { ...humidifier, band: { min: 5, max: 99 } }],
    ["a longer continuous run than the hard limit", { ...humidifier, maxContinuousOnMs: POLICY_ENVELOPE.maxContinuousOnMs + 1 }],
    ["a hysteresis that would make the relay chatter", { ...humidifier, hysteresis: 0.5 }],
    ["removing the safe state on sensor failure", { ...humidifier, onSensorInvalid: "on" as unknown as "off" }],
    ["disabling the actuation log", { ...humidifier, recordEveryActuation: false as unknown as true }],
  ])("refuses %s even when a person confirms", (_label, policy) => {
    expect(checkPolicyEnvelope(policy)).not.toEqual([])
    expect(applyPolicyChange(proposePolicyChange("person", policy, "x"), { by: "person", at: "now" })).toMatchObject({ ok: false })
  })
})

describe("automation eligibility", () => {
  it("is never eligible today and says exactly why", () => {
    const result = automationEligibility({ actuatorsInstalled: false, targetsConfirmed: false, validation: "sample", rangesSource: "profile" })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toHaveLength(4)
  })
  it("owner-confirmed ranges remove two reasons but not the missing hardware", () => {
    const result = automationEligibility({ actuatorsInstalled: false, targetsConfirmed: true, validation: "sample", rangesSource: "owner" })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toEqual(["El firmware actual es solo sensor.", "No hay actuadores instalados y verificados."])
  })
})
