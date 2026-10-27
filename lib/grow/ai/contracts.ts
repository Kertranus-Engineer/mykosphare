import type { EvidenceRef } from "./context"

/**
 * AI SUPERVISOR — OUTPUT CONTRACTS (TYPES ONLY; no provider is integrated).
 *
 * Four different things, deliberately distinct types with a `kind` brand so
 * they can never be confused or passed where another is expected:
 *
 *   AiSupervisorAssessment   — what the AI THINKS (claims with evidence).
 *   AiActionProposal         — what the AI SUGGESTS doing. Not a command.
 *   (DeviceCommand)          — future: created ONLY by the Policy/Safety
 *                              engines from an approved proposal, recorded in a
 *                              Command Ledger. Not defined here on purpose.
 *   (ConfirmedExecution)     — future: device ACK + telemetry verification.
 *
 * SAFETY INVARIANT: AI NEVER WRITES GPIO. Future path:
 *   AI Supervisor → ActionProposal → Policy Engine → Safety Engine
 *   → Command Ledger → Device Adapter → ACK → Telemetry verification
 */

export interface AiClaim {
  text: string
  /** Every claim must cite evidence from the AiCultivationContext. */
  evidence: readonly EvidenceRef[]
  confidence: "low" | "medium" | "high"
}

export interface AiSupervisorAssessment {
  kind: "ai_assessment"
  provenance: "ai_supervisor"
  contextGeneratedAt: string
  summary: string
  observations: readonly AiClaim[]
  needs: readonly AiClaim[]
  /** Questions for the human (e.g. "¿Ves primordios?"). */
  questions: readonly string[]
  recommendations: readonly AiClaim[]
  uncertainties: readonly string[]
}

export interface AiActionProposal {
  kind: "ai_action_proposal"
  provenance: "ai_supervisor"
  /** Human-readable intent, e.g. "raise humidity". Never a pin, relay or duty cycle. */
  intent: string
  rationale: readonly AiClaim[]
  /** A proposal is inert until a human and the policy/safety engines approve it. */
  status: "proposed"
  requiresHumanApproval: true
}

export type AiSupervisorOutput = AiSupervisorAssessment | AiActionProposal

/** Runtime guard for untrusted model output: only the two known shapes pass. */
export function isAiSupervisorOutput(value: unknown): value is AiSupervisorOutput {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  if (candidate.provenance !== "ai_supervisor") return false
  if (candidate.kind === "ai_assessment") return typeof candidate.summary === "string" && Array.isArray(candidate.observations)
  if (candidate.kind === "ai_action_proposal") {
    return typeof candidate.intent === "string" && candidate.status === "proposed" && candidate.requiresHumanApproval === true
  }
  return false
}
