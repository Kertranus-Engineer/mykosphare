import type { Recommendation } from "@/lib/recommendations/recommendation-engine"

export interface ActionProposal {
  id: string
  recommendationId: string
  parameter: string
  currentValue: number | string
  suggestedValue: number | string
  expectedOutcome: string
  confidence: number
}

let actionCounter = 0

function nextActionId(): string {
  return `act-${Date.now().toString(36)}-${(actionCounter++).toString(36).padStart(4, "0")}`
}

function makeProposal(
  recommendationId: string,
  parameter: string,
  currentValue: number | string,
  suggestedValue: number | string,
  expectedOutcome: string,
  confidence: number,
): ActionProposal {
  return {
    id: nextActionId(),
    recommendationId,
    parameter,
    currentValue,
    suggestedValue,
    expectedOutcome,
    confidence,
  }
}

function numericDiff(current: number | string, suggested: number | string): string {
  const c = typeof current === "number" ? current : parseFloat(current as string)
  const s = typeof suggested === "number" ? suggested : parseFloat(suggested as string)
  if (isNaN(c) || isNaN(s)) return ""
  const delta = s - c
  const sign = delta > 0 ? "+" : ""
  return `${sign}${delta}`
}

function percentDiff(current: number | string, suggested: number | string): string {
  const c = typeof current === "number" ? current : parseFloat(current as string)
  const s = typeof suggested === "number" ? suggested : parseFloat(suggested as string)
  if (isNaN(c) || isNaN(s) || c === 0) return ""
  const pct = Math.round(((s - c) / c) * 100)
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct}%`
}

const PROPOSAL_RULES: Array<{
  matchTitle: string
  parameter: string
  currentValue: number | string
  suggestedValue: number | string
  expectedOutcome: string
  confidence: number
}> = [
  {
    matchTitle: "Increase Ventilation Frequency",
    parameter: "fan_interval",
    currentValue: 180,
    suggestedValue: 120,
    expectedOutcome: "Reducing the fan interval from 180s to 120s increases airflow frequency. Lower humidity accumulation is expected within the next monitoring cycle.",
    confidence: 82,
  },
  {
    matchTitle: "Inspect Heat Sources",
    parameter: "heater_target",
    currentValue: 26,
    suggestedValue: 24,
    expectedOutcome: "Lowering the heater target from 26°C to 24°C reduces thermal load. Overheating risk decreases and temperature should stabilize closer to the optimal range.",
    confidence: 78,
  },
  {
    matchTitle: "Check Smartphone Capture System",
    parameter: "capture_interval",
    currentValue: 15,
    suggestedValue: 10,
    expectedOutcome: "Decreasing the capture interval from 15min to 10min increases monitoring coverage. More frequent visual samples improve detection of environmental changes.",
    confidence: 75,
  },
  {
    matchTitle: "Verify Telemetry Synchronization",
    parameter: "sync_interval",
    currentValue: 60,
    suggestedValue: 30,
    expectedOutcome: "Halving the synchronization interval from 60s to 30s improves timestamp alignment between captures and telemetry. Correlation accuracy should increase.",
    confidence: 70,
  },
  {
    matchTitle: "Continue Humidity Monitoring",
    parameter: "fan_interval",
    currentValue: 180,
    suggestedValue: 180,
    expectedOutcome: "Maintaining the current fan interval of 180s. Humidity levels are stable and no adjustment is needed at this time.",
    confidence: 90,
  },
  {
    matchTitle: "Maintain Temperature Controls",
    parameter: "heater_target",
    currentValue: 24,
    suggestedValue: 24,
    expectedOutcome: "Keeping the heater target at 24°C. Temperature is within acceptable bounds and current settings are adequate.",
    confidence: 90,
  },
  {
    matchTitle: "Keep Capture Schedule",
    parameter: "capture_interval",
    currentValue: 15,
    suggestedValue: 15,
    expectedOutcome: "Sustaining the current capture interval of 15min. The monitoring pipeline is operating reliably.",
    confidence: 90,
  },
  {
    matchTitle: "Sustain Telemetry Alignment",
    parameter: "sync_interval",
    currentValue: 60,
    suggestedValue: 60,
    expectedOutcome: "Continuing with a 60s synchronization interval. Telemetry alignment is stable.",
    confidence: 90,
  },
]

export interface ActionProposalGenerationResult {
  proposals: ActionProposal[]
}

export function generateActionProposals(recommendations: Recommendation[]): ActionProposalGenerationResult {
  actionCounter = 0

  const proposals: ActionProposal[] = []

  for (const rec of recommendations) {
    const rule = PROPOSAL_RULES.find((r) => rec.title === r.matchTitle)
    if (!rule) continue

    proposals.push(
      makeProposal(
        rec.id,
        rule.parameter,
        rule.currentValue,
        rule.suggestedValue,
        rule.expectedOutcome,
        rule.confidence,
      ),
    )
  }

  return { proposals }
}

export function formatProposalDiff(proposal: ActionProposal): {
  numeric: string
  percent: string
  isChange: boolean
} {
  return {
    numeric: numericDiff(proposal.currentValue, proposal.suggestedValue),
    percent: percentDiff(proposal.currentValue, proposal.suggestedValue),
    isChange: proposal.currentValue !== proposal.suggestedValue,
  }
}

export function getActionProposalsForCapture(
  proposals: ActionProposal[],
  captureRecommendations: Recommendation[],
): ActionProposal[] {
  const captureRecIds = new Set(captureRecommendations.map((r) => r.id))
  return proposals.filter((p) => captureRecIds.has(p.recommendationId))
}
