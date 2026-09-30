/**
 * SIMULATION / DEMO COMPOSITION — development and demonstration only.
 *
 * Composes Foundation pieces (sample run + SAMPLE profile + sample simulation
 * reading + buildGrowSnapshot) into the same GrowSnapshot contract the real
 * API returns. It adds no simulator of its own: extra scenarios only shift the
 * observation time of a Foundation sample reading or drop a metric through the
 * Foundation simulated adapter. Everything produced here is origin "simulated".
 * Nothing here is ever used as a fallback for real mode.
 */
import { adaptSimulatedTelemetry } from "../adapters/telemetry"
import { createSampleOysterRun, SAMPLE_PLEUROTUS_OSTREATUS_PROFILE } from "../fixtures"
import { DEFAULT_FRESHNESS_POLICY } from "../freshness"
import { createSampleSimulationReading, type SampleSimulationScenario } from "../simulation"
import { buildGrowSnapshot } from "../snapshot"
import type { GrowTimelineEvent } from "../timeline"
import type { CultivationRun, EnvironmentalReading, GrowSnapshot, GrowthStage } from "../types"

export const GROW_DEMO_SCENARIOS = [
  "stable",
  "dry",
  "humid",
  "cold",
  "hot",
  "critical",
  "partial",
  "stale",
  "offline",
  "no-data",
] as const

export type GrowDemoScenario = (typeof GROW_DEMO_SCENARIOS)[number]

export function isGrowDemoScenario(value: unknown): value is GrowDemoScenario {
  return typeof value === "string" && (GROW_DEMO_SCENARIOS as readonly string[]).includes(value)
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Elapsed days used for the demo run so the suggested stage matches a requested stage. */
const DEMO_ELAPSED_DAYS_FOR_STAGE: Record<GrowthStage, number> = {
  inoculation: 1,
  colonization: 5,
  consolidation: 9,
  primordia: 13,
  fruiting: 17,
  harvest: 22,
}

/**
 * Default demo keeps the Foundation sample run (confirmed colonization) but
 * rebases it to "now" 10 days ago, so its elapsed-day suggestion (consolidation)
 * differs from the confirmed stage and the UI demonstrates "posible cambio".
 */
const DEFAULT_DEMO_ELAPSED_DAYS = 10

/** Six-hour offset keeps elapsed time away from day boundaries. */
const DAY_OFFSET = 6 * HOUR

export function createDemoRun(now: Date, stage: GrowthStage | null): CultivationRun {
  const sample = createSampleOysterRun()
  const elapsedDays = stage ? DEMO_ELAPSED_DAYS_FOR_STAGE[stage] : DEFAULT_DEMO_ELAPSED_DAYS
  const startedAt = new Date(now.getTime() - elapsedDays * DAY - DAY_OFFSET)
  return {
    ...sample,
    startedAt: startedAt.toISOString(),
    confirmedStage: stage ?? sample.confirmedStage,
    stageConfirmedAt: new Date(startedAt.getTime() + DAY).toISOString(),
  }
}

function foundationReading(scenario: SampleSimulationScenario, at: Date): EnvironmentalReading | null {
  return createSampleSimulationReading({ scenario, now: at, deviceId: "simulation" })
}

function demoReading(scenario: GrowDemoScenario, now: Date): EnvironmentalReading | null {
  switch (scenario) {
    case "stable":
    case "dry":
    case "humid":
    case "cold":
    case "hot":
      return foundationReading(scenario, now)
    // Critical sample values; fixture data, not a threshold.
    case "critical":
      return adaptSimulatedTelemetry({ temperature: 22, humidity: 40, timestamp: now.toISOString(), deviceId: "simulation" })
    // Humidity channel absent: the metric is omitted, never zeroed.
    case "partial":
      return adaptSimulatedTelemetry({ temperature: 22, timestamp: now.toISOString(), deviceId: "simulation" })
    case "stale":
      return foundationReading("stable", new Date(now.getTime() - DEFAULT_FRESHNESS_POLICY.staleAfterMs * 2))
    case "offline":
      return foundationReading("stable", new Date(now.getTime() - DEFAULT_FRESHNESS_POLICY.offlineAfterMs * 4))
    // Foundation's "offline" scenario yields no reading at all → unknown freshness.
    case "no-data":
      return foundationReading("offline", now)
  }
}

type DemoEventSpec = [minutesAgo: number, kind: GrowTimelineEvent["kind"], metric?: GrowTimelineEvent["metric"]]

/** Explicit simulated fixtures. None of them claims an actuator acted. */
const DEMO_TIMELINES: Record<GrowDemoScenario, DemoEventSpec[]> = {
  stable: [[360, "condition_stable"], [200, "metric_dropped", "humidity"], [185, "metric_recovered", "humidity"], [30, "condition_stable"]],
  dry: [[360, "condition_stable"], [100, "metric_dropped", "humidity"]],
  humid: [[360, "condition_stable"], [90, "metric_rose", "humidity"]],
  cold: [[360, "condition_stable"], [80, "metric_dropped", "temperature"]],
  hot: [[360, "condition_stable"], [70, "metric_rose", "temperature"]],
  critical: [[420, "condition_stable"], [150, "metric_dropped", "humidity"], [25, "metric_dropped", "humidity"]],
  partial: [[300, "condition_stable"], [20, "metric_missing", "humidity"]],
  stale: [[300, "condition_stable"], [10, "reading_received"]],
  offline: [[360, "condition_stable"], [120, "reading_received"], [90, "signal_lost"]],
  "no-data": [],
}

export function createDemoTimeline(scenario: GrowDemoScenario, now: Date): GrowTimelineEvent[] {
  return DEMO_TIMELINES[scenario].map(([minutesAgo, kind, metric], index) => ({
    id: `demo-${scenario}-${index}`,
    at: new Date(now.getTime() - minutesAgo * MINUTE).toISOString(),
    kind,
    ...(metric ? { metric } : {}),
    origin: "simulated" as const,
  }))
}

export interface DemoGrowComposition {
  snapshot: GrowSnapshot
  timeline: GrowTimelineEvent[]
}

export function buildDemoGrowComposition(input: {
  scenario: GrowDemoScenario
  stage: GrowthStage | null
  now: Date
}): DemoGrowComposition {
  const snapshot = buildGrowSnapshot({
    run: createDemoRun(input.now, input.stage),
    profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
    reading: demoReading(input.scenario, input.now),
    now: input.now,
  })
  return { snapshot, timeline: createDemoTimeline(input.scenario, input.now) }
}
