import type { CultivationRun, DataOrigin, StageId } from "./types"

/**
 * Structured cultivation events for the human timeline ("Hoy" / "Historia").
 *
 * Events are facts produced by a source (run records, demo fixtures today,
 * persisted run events tomorrow). Renderers never generate them. An event must
 * never claim an actuator acted unless a real command was executed and
 * acknowledged, so there is deliberately no actuator kind yet.
 */
export type GrowTimelineEventKind =
  | "cultivation_started"
  | "stage_confirmed"
  | "capture_added"
  | "condition_stable"
  | "metric_dropped"
  | "metric_rose"
  | "metric_recovered"
  | "metric_missing"
  | "reading_received"
  | "signal_lost"

export interface GrowTimelineEvent {
  id: string
  at: string
  kind: GrowTimelineEventKind
  metric?: "temperature" | "humidity"
  /** Only for stage_confirmed. */
  stage?: StageId
  /** Whether this event describes real or simulated observations. */
  origin: DataOrigin
}

function validTime(value: string | undefined): value is string {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime())
}

/**
 * Milestones that are facts of the run record itself (start, confirmed stage).
 * Nothing is inferred: absent or invalid dates produce no event.
 */
export function runMilestoneEvents(run: CultivationRun, origin: DataOrigin): GrowTimelineEvent[] {
  const events: GrowTimelineEvent[] = []
  if (validTime(run.startedAt)) {
    events.push({ id: `${run.id}-started`, at: run.startedAt, kind: "cultivation_started", origin })
  }
  if (validTime(run.stageConfirmedAt)) {
    events.push({ id: `${run.id}-stage-${run.confirmedStage}`, at: run.stageConfirmedAt, kind: "stage_confirmed", stage: run.confirmedStage, origin })
  }
  return events
}
