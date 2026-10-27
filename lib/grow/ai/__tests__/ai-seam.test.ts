import { describe, expect, it } from "vitest"
import { buildCultivationTwin, createSampleOysterRun, SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, type EnvironmentalReading } from "@/lib/grow"
import { projectAiCultivationContext } from "../context"
import { isAiSupervisorOutput, type AiActionProposal, type AiSupervisorAssessment } from "../contracts"

const NOW = "2026-09-30T12:00:00.000Z"
const reading: EnvironmentalReading = { temperature: 22, humidity: 50, timestamp: "2026-09-30T11:59:00.000Z", origin: "real", source: "grow-readings", deviceId: "esp32-SECRET-HW-ID" }

function twin() {
  return buildCultivationTwin({
    mode: "real",
    run: createSampleOysterRun(),
    profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
    latestReading: reading,
    installedCapabilities: ["temperature", "humidity"],
    recentReadings: [
      { observedAt: "2026-09-30T08:00:00.000Z", temperature: 21, humidity: 66, provenance: "sensor" },
      { observedAt: "2026-09-30T11:00:00.000Z", temperature: 22, humidity: 52, provenance: "sensor" },
    ],
    recentEvents: [{ id: "ev-1", type: "stage_confirmed", occurredAt: "2026-09-23T12:00:00.000Z", provenance: "manual", stage: "colonization" }],
    latestCapture: { id: "cap-9", capturedAt: "2026-09-30T11:30:00.000Z", provenance: "sensor", storagePath: "snapshots/owner-uuid/secret-path.jpg" },
    now: NOW,
  })
}

describe("AiCultivationContext (pure projection)", () => {
  it("contains only allow-listed fields", () => {
    const context = projectAiCultivationContext(twin())
    expect(Object.keys(context).sort()).toEqual(
      ["age", "dataStatus", "freshness", "generatedAt", "health", "latestCapture", "missingCapabilities", "mode", "needs", "observations", "organism", "recentEvents", "schemaVersion", "stage", "targets", "trend"].sort(),
    )
    expect(context).toMatchObject({ mode: "real", organism: { scientificName: "Pleurotus ostreatus", profileValidation: "sample" }, age: { cultivationDay: 11 } })
    expect(context.stage.suggested).toEqual({ id: "consolidation", provenance: "deterministic" })
    expect(context.trend.humidity).toEqual({ min: 52, max: 66, first: 66, last: 52 })
  })

  it("never carries credentials, identifiers, storage paths or owner data", () => {
    const serialized = JSON.stringify(projectAiCultivationContext(twin()))
    for (const forbidden of ["esp32-SECRET-HW-ID", "secret-path", "snapshots/", "owner", "key_hash", "x-device-key", "service_role", "password", "deviceId", "storagePath", "chamberId"]) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  it("represents missing sensors as unavailable, never as zero", () => {
    const context = projectAiCultivationContext(twin())
    expect(context.missingCapabilities).toEqual(expect.arrayContaining([{ capability: "co2", reason: "not_installed" }, { capability: "vision", reason: "not_installed" }]))
    expect(context.observations.find((o) => o.capability === "co2")).toBeUndefined()
    const offline = projectAiCultivationContext(buildCultivationTwin({ mode: "real", run: createSampleOysterRun(), profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, latestReading: null, installedCapabilities: ["temperature"], now: NOW }))
    expect(offline.observations).toEqual([{ capability: "temperature", value: null, unit: "°C", observedAt: null, provenance: null, evidence: "capability:temperature" }])
    expect(offline.missingCapabilities).toEqual(expect.arrayContaining([{ capability: "temperature", reason: "not_reporting" }]))
  })

  it("attaches provenance and evidence references to every fact", () => {
    const context = projectAiCultivationContext(twin())
    expect(context.observations.find((o) => o.capability === "humidity")).toEqual({ capability: "humidity", value: 50, unit: "%", observedAt: reading.timestamp, provenance: "sensor", evidence: `reading:${reading.timestamp}` })
    expect(context.recentEvents[0]).toMatchObject({ provenance: "manual", evidence: "event:ev-1" })
    expect(context.latestCapture).toEqual({ capturedAt: "2026-09-30T11:30:00.000Z", provenance: "sensor", evidence: "capture:cap-9" })
    expect(context.targets.evidence).toBe(`target:${SAMPLE_PLEUROTUS_OSTREATUS_PROFILE.id}/colonization`)
  })
})

describe("AI output contracts cannot be confused with commands", () => {
  const assessment: AiSupervisorAssessment = {
    kind: "ai_assessment", provenance: "ai_supervisor", contextGeneratedAt: NOW, summary: "Humedad baja",
    observations: [{ text: "La humedad está por debajo del rango", evidence: ["reading:2026-09-30T11:59:00.000Z", "target:x/colonization"], confidence: "high" }],
    needs: [], questions: [], recommendations: [], uncertainties: [],
  }
  const proposal: AiActionProposal = { kind: "ai_action_proposal", provenance: "ai_supervisor", intent: "raise humidity", rationale: [], status: "proposed", requiresHumanApproval: true }

  it("accepts only the two known AI shapes", () => {
    expect(isAiSupervisorOutput(assessment)).toBe(true)
    expect(isAiSupervisorOutput(proposal)).toBe(true)
    expect(isAiSupervisorOutput({ kind: "device_command", relay: 1, on: true, provenance: "ai_supervisor" })).toBe(false)
    expect(isAiSupervisorOutput({ ...proposal, status: "approved" })).toBe(false)
    expect(isAiSupervisorOutput({ ...proposal, requiresHumanApproval: false })).toBe(false)
    expect(isAiSupervisorOutput({ ...assessment, provenance: "sensor" })).toBe(false)
  })

  it("a proposal type cannot be marked executed or skip human approval", () => {
    // @ts-expect-error — proposals are inert; they have no executed state.
    const executed: AiActionProposal = { ...proposal, status: "executed" }
    // @ts-expect-error — human approval is mandatory.
    const autonomous: AiActionProposal = { ...proposal, requiresHumanApproval: false }
    expect([executed, autonomous]).toHaveLength(2)
  })
})
