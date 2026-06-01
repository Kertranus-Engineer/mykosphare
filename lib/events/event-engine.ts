import type { ProcessedCapture } from "@/lib/capture-processing/types"
import type { TelemetryRow } from "@/lib/services/telemetry-service"
import type { CorrelatedCapture } from "@/lib/correlation/correlation-engine"

export type EventSeverity = "info" | "warning" | "critical"

export type EventCategory =
  | "temperature"
  | "humidity"
  | "co2"
  | "capture"
  | "correlation"
  | "system"

export interface EnvironmentalEvent {
  id: string
  timestamp: string
  severity: EventSeverity
  category: EventCategory
  title: string
  description: string
  captureId?: string
  value?: number
  threshold?: number
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

const TEMP_FAN_ON = 28
const TEMP_CRITICAL = 32
const HUM_HIGH = 75
const HUM_LOW = 45
const CO2_WARNING = 1000
const CO2_CRITICAL = 2000
const CORRELATION_LOW = 50
const CAPTURE_INTERVAL_HOURS = 24

let eventCounter = 0

function nextEventId(): string {
  return `evt-${Date.now().toString(36)}-${(eventCounter++).toString(36).padStart(4, "0")}`
}

function makeEvent(
  timestamp: string,
  severity: EventSeverity,
  category: EventCategory,
  title: string,
  description: string,
  opts?: { captureId?: string; value?: number; threshold?: number },
): EnvironmentalEvent {
  return {
    id: nextEventId(),
    timestamp,
    severity,
    category,
    title,
    description,
    ...opts,
  }
}

function generateTelemetryEvents(rows: TelemetryRow[]): EnvironmentalEvent[] {
  const events: EnvironmentalEvent[] = []

  for (const row of rows) {
    const ts = row.created_at

    if (row.temperature != null) {
      if (row.temperature >= TEMP_CRITICAL) {
        events.push(makeEvent(ts, "critical", "temperature", "Critical temperature exceeded", `Temperature reached ${row.temperature.toFixed(1)}°C, exceeding the ${TEMP_CRITICAL}°C critical threshold.`, { value: row.temperature, threshold: TEMP_CRITICAL }))
      } else if (row.temperature >= TEMP_FAN_ON) {
        events.push(makeEvent(ts, "warning", "temperature", "Elevated temperature", `Temperature at ${row.temperature.toFixed(1)}°C has exceeded the ${TEMP_FAN_ON}°C threshold. Fan activation recommended.`, { value: row.temperature, threshold: TEMP_FAN_ON }))
      }
    }

    if (row.humidity != null) {
      if (row.humidity > HUM_HIGH) {
        events.push(makeEvent(ts, "warning", "humidity", "High humidity anomaly", `Humidity at ${row.humidity.toFixed(1)}% has exceeded the ${HUM_HIGH}% upper threshold.`, { value: row.humidity, threshold: HUM_HIGH }))
      } else if (row.humidity < HUM_LOW) {
        events.push(makeEvent(ts, "warning", "humidity", "Low humidity anomaly", `Humidity at ${row.humidity.toFixed(1)}% has fallen below the ${HUM_LOW}% lower threshold.`, { value: row.humidity, threshold: HUM_LOW }))
      }
    }

    if (row.co2 != null) {
      if (row.co2 >= CO2_CRITICAL) {
        events.push(makeEvent(ts, "critical", "co2", "Critical CO₂ levels", `CO₂ at ${row.co2} ppm has exceeded the ${CO2_CRITICAL} ppm critical threshold. Immediate ventilation required.`, { value: row.co2, threshold: CO2_CRITICAL }))
      } else if (row.co2 >= CO2_WARNING) {
        events.push(makeEvent(ts, "warning", "co2", "Elevated CO₂ levels", `CO₂ at ${row.co2} ppm has exceeded the ${CO2_WARNING} ppm warning threshold.`, { value: row.co2, threshold: CO2_WARNING }))
      }
    }
  }

  return events
}

function generateCaptureEvents(captures: ProcessedCapture[]): EnvironmentalEvent[] {
  const events: EnvironmentalEvent[] = []

  for (const capture of captures) {
    if (capture.isDuplicate) {
      events.push(makeEvent(capture.uploadedAt, "warning", "capture", "Duplicate capture detected", `Capture "${capture.filename}" has a hash matching an existing image.`, { captureId: capture.id }))
    }
  }

  const sorted = [...captures].sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
  )

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const hoursDiff = (new Date(curr.uploadedAt).getTime() - new Date(prev.uploadedAt).getTime()) / (1000 * 60 * 60)

    if (hoursDiff > CAPTURE_INTERVAL_HOURS * 1.5) {
      events.push(makeEvent(curr.uploadedAt, "warning", "capture", "Missing expected capture", `No capture received for ${Math.round(hoursDiff)} hours. Expected interval is ${CAPTURE_INTERVAL_HOURS}h.`, { captureId: curr.id, value: Math.round(hoursDiff), threshold: CAPTURE_INTERVAL_HOURS }))
    }
  }

  if (captures.length > 0) {
    const latest = sorted[sorted.length - 1]
    const hoursSince = (Date.now() - new Date(latest.uploadedAt).getTime()) / (1000 * 60 * 60)
    if (hoursSince > CAPTURE_INTERVAL_HOURS * 1.2) {
      events.push(makeEvent(new Date().toISOString(), "warning", "capture", "Capture overdue", `Last capture received ${Math.round(hoursSince)} hours ago. Expected interval is ${CAPTURE_INTERVAL_HOURS}h.`, { captureId: latest.id, value: Math.round(hoursSince), threshold: CAPTURE_INTERVAL_HOURS }))
    }
  }

  return events
}

function generateCorrelationEvents(correlated: CorrelatedCapture[]): EnvironmentalEvent[] {
  const events: EnvironmentalEvent[] = []

  for (const result of correlated) {
    if (!result.telemetry) {
      events.push(makeEvent(result.capture.uploadedAt, "warning", "correlation", "No correlated telemetry", `Capture "${result.capture.filename}" has no matching telemetry data within the search window.`, { captureId: result.capture.id }))
    } else if (result.correlationScore < CORRELATION_LOW) {
      events.push(makeEvent(result.capture.uploadedAt, "warning", "correlation", "Low telemetry correlation", `Capture "${result.capture.filename}" has poor timestamp alignment (${result.correlationScore}% score, ${result.timeOffsetSeconds}s offset).`, { captureId: result.capture.id, value: result.correlationScore, threshold: CORRELATION_LOW }))
    }
  }

  return events
}

function generateSystemEvents(
  telemetryEntries: TelemetryRow[],
  captures: ProcessedCapture[],
): EnvironmentalEvent[] {
  const events: EnvironmentalEvent[] = []

  if (telemetryEntries.length === 0) {
    events.push(makeEvent(new Date().toISOString(), "warning", "system", "No telemetry data available", "The telemetry store contains no records for correlation. ESP32 may be offline or data collection has not started."))
  }

  if (captures.length === 0) {
    events.push(makeEvent(new Date().toISOString(), "info", "system", "No captures registered", "No images have been uploaded to the Supabase snapshots bucket. Live monitoring requires at least one capture."))
  }

  return events
}

export interface EventGenerationInput {
  telemetry?: TelemetryRow[]
  captures?: ProcessedCapture[]
  correlated?: CorrelatedCapture[]
}

export interface EventGenerationResult {
  events: EnvironmentalEvent[]
  stats: {
    total: number
    info: number
    warning: number
    critical: number
  }
}

export function generateEvents(input: EventGenerationInput): EventGenerationResult {
  eventCounter = 0

  const telemetry = input.telemetry ?? []
  const captures = input.captures ?? []
  const correlated = input.correlated ?? []

  const telemetryEvents = generateTelemetryEvents(telemetry)
  const captureEvents = generateCaptureEvents(captures)
  const correlationEvents = generateCorrelationEvents(correlated)
  const systemEvents = generateSystemEvents(telemetry, captures)

  const allEvents = [
    ...telemetryEvents,
    ...captureEvents,
    ...correlationEvents,
    ...systemEvents,
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return {
    events: allEvents,
    stats: {
      total: allEvents.length,
      info: allEvents.filter((e) => e.severity === "info").length,
      warning: allEvents.filter((e) => e.severity === "warning").length,
      critical: allEvents.filter((e) => e.severity === "critical").length,
    },
  }
}

export function getEventsForCapture(
  events: EnvironmentalEvent[],
  captureId: string,
): EnvironmentalEvent[] {
  return events.filter((e) => e.captureId === captureId)
}

export function getEventsByWindow(
  events: EnvironmentalEvent[],
  timestamp: string,
  windowMs: number = 600_000,
): EnvironmentalEvent[] {
  const center = new Date(timestamp).getTime()
  return events.filter((e) => {
    const ts = new Date(e.timestamp).getTime()
    return Math.abs(ts - center) <= windowMs
  })
}
