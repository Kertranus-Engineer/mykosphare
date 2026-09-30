import type { DeviceFreshness, GrowHealth, GrowSnapshot } from "../types"
import { GROW_COPY } from "./copy.es"
import { relativeAgo } from "./format"

/** Visual tone vocabulary shared by Grower components. Semantic, never numeric. */
export type GrowTone = "calm" | "attention" | "critical" | "unknown"

export interface PresentedStatus {
  title: string
  body: string
  tone: GrowTone
  /** "Última lectura hace …" when a reading exists; null otherwise. */
  lastReading: string | null
}

function toneForHealth(health: GrowHealth, freshness: DeviceFreshness): GrowTone {
  if (freshness !== "live") return "unknown"
  if (health === "healthy") return "calm"
  if (health === "attention") return "attention"
  if (health === "critical") return "critical"
  return "unknown"
}

function criticalBody(snapshot: GrowSnapshot): string {
  const { temperature, humidity } = snapshot.state.conditions
  const t = temperature.status === "critical"
  const h = humidity.status === "critical"
  if (t && h) return GROW_COPY.status.criticalBoth
  if (h) return GROW_COPY.status.criticalHumidity
  if (t) return GROW_COPY.status.criticalTemperature
  return GROW_COPY.status.critical.body
}

function temperatureCopy(snapshot: GrowSnapshot) {
  const status = snapshot.state.conditions.temperature.status
  if (status === "low") return GROW_COPY.status.temperatureLow
  if (status === "high") return GROW_COPY.status.temperatureHigh
  return GROW_COPY.status.temperatureOut
}

function unknownBody(snapshot: GrowSnapshot): string {
  if (snapshot.state.needs.some((need) => need.kind === "profile_missing")) return GROW_COPY.status.unknownProfile
  if (snapshot.reading && snapshot.state.dataStatus === "partial") return GROW_COPY.status.unknownPartial
  return GROW_COPY.status.unknown.body
}

/**
 * Maps the domain message key (plus semantic condition statuses) to human copy.
 * It never looks at raw values or thresholds.
 */
export function presentStatus(snapshot: GrowSnapshot, now: string | Date): PresentedStatus {
  const ago = snapshot.reading ? relativeAgo(snapshot.reading.timestamp, now) : null
  const lastReading = ago ? GROW_COPY.time.lastReading(ago) : null
  const tone = toneForHealth(snapshot.state.health, snapshot.state.freshness)
  const key = snapshot.myko.messageKey

  switch (key) {
    case "myko.status.offline":
      return { ...GROW_COPY.status.offline, body: lastReading ? `${lastReading}.` : GROW_COPY.status.offline.body, tone, lastReading }
    case "myko.status.stale":
      return { ...GROW_COPY.status.stale, body: lastReading ? `${lastReading}. ${GROW_COPY.status.stale.body}` : GROW_COPY.status.stale.body, tone, lastReading }
    case "myko.status.critical":
      return { title: GROW_COPY.status.critical.title, body: criticalBody(snapshot), tone, lastReading }
    case "myko.status.humidity_low":
      return { ...GROW_COPY.status.humidityLow, tone, lastReading }
    case "myko.status.humidity_high":
      return { ...GROW_COPY.status.humidityHigh, tone, lastReading }
    case "myko.status.temperature_attention":
      return { ...temperatureCopy(snapshot), tone, lastReading }
    // Simulation keeps the normal human message; provenance is shown by SourceBadge.
    case "myko.status.simulated":
    case "myko.status.healthy":
      return { ...GROW_COPY.status.healthy, tone, lastReading }
    case "myko.status.unknown":
    default:
      return { title: GROW_COPY.status.unknown.title, body: unknownBody(snapshot), tone: "unknown", lastReading }
  }
}
