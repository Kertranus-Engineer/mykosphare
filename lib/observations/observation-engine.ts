import type { EnvironmentalEvent, EventSeverity } from "@/lib/events/event-engine"

export interface Observation {
  id: string
  timestamp: string
  severity: EventSeverity
  title: string
  summary: string
  sourceEvents: string[]
}

const SEVERITY_COLORS = {
  info: "text-sky-500",
  warning: "text-amber-500",
  critical: "text-red-500",
} as const

const SEVERITY_BG = {
  info: "bg-sky-500/10 border-sky-500/20",
  warning: "bg-amber-500/10 border-amber-500/20",
  critical: "bg-red-500/10 border-red-500/20",
} as const

const SEVERITY_DOT = {
  info: "bg-sky-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
} as const

export { SEVERITY_COLORS, SEVERITY_BG, SEVERITY_DOT }

let observationCounter = 0

function nextObservationId(): string {
  return `obs-${Date.now().toString(36)}-${(observationCounter++).toString(36).padStart(4, "0")}`
}

function makeObservation(
  timestamp: string,
  severity: EventSeverity,
  title: string,
  summary: string,
  sourceEvents: string[],
): Observation {
  return {
    id: nextObservationId(),
    timestamp,
    severity,
    title,
    summary,
    sourceEvents,
  }
}

export interface ObservationGenerationResult {
  observations: Observation[]
  stats: {
    total: number
    info: number
    warning: number
    critical: number
  }
}

export function generateObservations(events: EnvironmentalEvent[]): ObservationGenerationResult {
  observationCounter = 0

  const observations: Observation[] = []
  const timestamp = new Date().toISOString()

  const warningEvents = events.filter(
    (e) => e.severity === "warning" || e.severity === "critical",
  )

  if (warningEvents.length === 0) {
    observations.push(
      makeObservation(
        timestamp,
        "info",
        "Environment Stable",
        "All environmental parameters are within expected ranges. No anomalies detected.",
        [],
      ),
    )
  } else {
    const humidityWarnings = events.filter(
      (e) => e.category === "humidity" && (e.severity === "warning" || e.severity === "critical"),
    )
    if (humidityWarnings.length > 0) {
      observations.push(
        makeObservation(
          timestamp,
          "warning",
          "Elevated Humidity Detected",
          "Humidity readings have deviated from the target range. The environment may require ventilation or dehumidification.",
          humidityWarnings.map((e) => e.id),
        ),
      )
    }

    const tempWarnings = events.filter(
      (e) => e.category === "temperature" && (e.severity === "warning" || e.severity === "critical"),
    )
    if (tempWarnings.length > 0) {
      observations.push(
        makeObservation(
          timestamp,
          "warning",
          "Temperature Trend Requires Attention",
          "Temperature readings indicate a sustained deviation. Monitor closely and consider adjusting environmental controls.",
          tempWarnings.map((e) => e.id),
        ),
      )
    }

    const captureWarnings = events.filter(
      (e) => e.category === "capture" && (e.severity === "warning" || e.severity === "critical"),
    )
    if (captureWarnings.length > 0) {
      observations.push(
        makeObservation(
          timestamp,
          "warning",
          "Visual Monitoring Interrupted",
          "Capture events indicate gaps or irregularities in the visual monitoring pipeline. Verify camera connectivity and upload schedule.",
          captureWarnings.map((e) => e.id),
        ),
      )
    }

    const correlationWarnings = events.filter(
      (e) => e.category === "correlation",
    )
    if (correlationWarnings.length > 0) {
      observations.push(
        makeObservation(
          timestamp,
          "warning",
          "Telemetry Correlation Unavailable",
          "One or more captures could not be matched with telemetry data. Check sensor connectivity and timestamp synchronization.",
          correlationWarnings.map((e) => e.id),
        ),
      )
    }
  }

  const stats = {
    total: observations.length,
    info: observations.filter((o) => o.severity === "info").length,
    warning: observations.filter((o) => o.severity === "warning").length,
    critical: observations.filter((o) => o.severity === "critical").length,
  }

  return { observations, stats }
}

export function getObservationsForCapture(
  observations: Observation[],
  events: EnvironmentalEvent[],
  captureId: string,
): Observation[] {
  const captureEventIds = new Set(
    events.filter((e) => e.captureId === captureId).map((e) => e.id),
  )

  return observations.filter((o) =>
    o.sourceEvents.some((id) => captureEventIds.has(id)),
  )
}
