import type { DataOrigin } from "./types"

/**
 * Structured cultivation events for the human timeline ("Hoy").
 *
 * Events are facts produced by a source (demo fixtures today, persisted run
 * events tomorrow). Renderers never generate them. An event must never claim
 * an actuator acted unless a real command was executed and acknowledged, so
 * there is deliberately no actuator kind yet.
 */
export type GrowTimelineEventKind =
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
  /** Whether this event describes real or simulated observations. */
  origin: DataOrigin
}
