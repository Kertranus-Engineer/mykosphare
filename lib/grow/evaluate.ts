import { DEFAULT_FRESHNESS_POLICY, evaluateFreshness } from "./freshness"
import { suggestStageForRun } from "./stages"
import type {
  EvaluateGrowStateInput,
  GrowCondition,
  GrowNeed,
  GrowState,
  MetricEvaluation,
  MetricTarget,
} from "./types"

function evaluateMetric(value: number | undefined, target: MetricTarget | undefined): MetricEvaluation {
  if (value === undefined || !Number.isFinite(value) || !target) {
    return { status: "unknown", value: null, target: target ?? null }
  }
  if ((target.criticalMin !== undefined && value <= target.criticalMin) ||
      (target.criticalMax !== undefined && value >= target.criticalMax)) {
    return { status: "critical", value, target }
  }
  if (value < target.min) return { status: "low", value, target }
  if (value > target.max) return { status: "high", value, target }
  return { status: "ok", value, target }
}

function deriveNeeds(
  freshness: GrowState["freshness"],
  temperature: MetricEvaluation,
  humidity: MetricEvaluation,
  profileExists: boolean,
): GrowNeed[] {
  if (freshness === "offline") return [{ kind: "telemetry_offline", severity: "unknown" }]
  if (freshness === "stale") return [{ kind: "telemetry_stale", severity: "unknown" }]
  if (freshness === "unknown") return [{ kind: "telemetry_unknown", severity: "unknown" }]
  if (!profileExists) return [{ kind: "profile_missing", severity: "unknown" }]

  const needs: GrowNeed[] = []
  const severityFor = (status: GrowCondition): GrowNeed["severity"] =>
    status === "critical" ? "critical" : "attention"

  if (temperature.status === "low" || temperature.status === "high" || temperature.status === "critical") {
    needs.push({ kind: "temperature_attention", severity: severityFor(temperature.status), metric: "temperature" })
  }
  if (humidity.status === "low" || humidity.status === "critical") {
    needs.push({ kind: "humidity", severity: severityFor(humidity.status), metric: "humidity" })
  }
  if (humidity.status === "high" || humidity.status === "critical" || temperature.status === "high" || temperature.status === "critical") {
    needs.push({ kind: "ventilation", severity: humidity.status === "critical" || temperature.status === "critical" ? "critical" : "attention" })
  }
  return needs
}

function deriveHealth(
  freshness: GrowState["freshness"],
  dataStatus: GrowState["dataStatus"],
  profileExists: boolean,
  temperature: MetricEvaluation,
  humidity: MetricEvaluation,
): GrowState["health"] {
  if (freshness !== "live" || !profileExists || dataStatus !== "complete") return "unknown"
  const statuses = [temperature.status, humidity.status]
  if (statuses.includes("unknown")) return "unknown"
  if (statuses.includes("critical")) return "critical"
  if (statuses.includes("low") || statuses.includes("high")) return "attention"
  return "healthy"
}

function dataStatus(
  reading: EvaluateGrowStateInput["reading"],
  stageTargets: ReturnType<typeof getStageTargets>,
): GrowState["dataStatus"] {
  if (!reading || !stageTargets?.temperature || !stageTargets.humidity) return "insufficient"
  const present = [reading.temperature, reading.humidity].filter((value) =>
    value !== undefined && Number.isFinite(value),
  ).length
  if (present === 2) return "complete"
  return present === 1 ? "partial" : "insufficient"
}

function getStageTargets(input: EvaluateGrowStateInput) {
  return input.profile.stageTargets[input.run.confirmedStage]
}

export function evaluateGrowState(input: EvaluateGrowStateInput): GrowState {
  const stageTargets = getStageTargets(input)
  const freshness = evaluateFreshness(
    input.reading?.timestamp,
    input.now,
    input.freshnessPolicy ?? DEFAULT_FRESHNESS_POLICY,
  )
  const temperature = evaluateMetric(input.reading?.temperature, stageTargets?.temperature)
  const humidity = evaluateMetric(input.reading?.humidity, stageTargets?.humidity)
  const profileComplete = Boolean(stageTargets?.temperature && stageTargets.humidity)
  const completeness = dataStatus(input.reading, stageTargets)

  return {
    run: input.run,
    confirmedStage: input.run.confirmedStage,
    suggestedStage: suggestStageForRun(input.run.startedAt, input.now),
    freshness,
    origin: input.reading?.origin ?? null,
    dataStatus: completeness,
    conditions: { temperature, humidity },
    needs: deriveNeeds(freshness, temperature, humidity, profileComplete),
    health: deriveHealth(freshness, completeness, profileComplete, temperature, humidity),
  }
}
