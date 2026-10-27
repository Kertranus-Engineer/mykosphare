/**
 * MYKO INTELLIGENCE V1 — shared types. Pure domain: no React, no routes, no database, no network.
 * Everything here is derived from real readings supplied by the caller; nothing is invented.
 */
export type MetricId = "temperature" | "humidity"

export interface Range { min: number; max: number; criticalMin?: number; criticalMax?: number }
export interface EnvTargets {
  temperature?: Range
  humidity?: Range
  /** Where the ranges come from, for transparency in the UI. */
  label?: string
  validation?: "sample" | "experimental" | "validated"
}

export interface ReadingPoint { observedAt: string; temperature: number | null; humidity: number | null }
export interface DeviceInfo { name?: string; enabled: boolean; lastSeenAt: string | null }

export interface IntelligenceConfig {
  freshness: { staleAfterMs: number; offlineAfterMs: number }
  /** A metric leaves an out-of-range state only after re-entering the range by this margin. */
  hysteresis: Record<MetricId, number>
  /** An excursion counts only if it holds for this many consecutive samples AND this long. */
  persistence: { samples: number; minMs: number }
  rapidChange: { windowMs: number; minSpanMs: number; temperature: number; humidity: number }
  physicalBounds: Record<MetricId, readonly [number, number]>
  /** Largest believable change between two consecutive samples; bigger means a faulty sample. */
  maxSampleJump: Record<MetricId, number>
}

export type Severity = "info" | "attention" | "critical"
export type Tone = "ok" | "info" | "attention" | "critical" | "muted"

export type FindingKind =
  | "in_range" | "temperature_low" | "temperature_high" | "humidity_low" | "humidity_high"
  | "rapid_change" | "reading_stale" | "device_offline" | "device_disabled"
  | "sensor_invalid" | "insufficient_data" | "needs_configuration"

export interface Finding {
  /** Stable across evaluations while the same condition persists (no repeated alerts). */
  id: string
  kind: FindingKind
  severity: Severity
  metric?: MetricId
  value?: number | null
  target?: Range | null
  /** When the condition began (episodes) or the evidence timestamp. */
  since?: string
  observedAt?: string
}

export interface ProposedIntent {
  /** Human-readable intent. Never a pin, relay or duty cycle. */
  intent: "raise_humidity" | "lower_humidity" | "raise_temperature" | "lower_temperature" | "ventilate"
  available: false
  unavailableReason: string
}

export interface Recommendation {
  id: string
  findingId: string
  findingKind: FindingKind
  severity: Severity
  metric?: MetricId
  title: string
  body: string
  /** The measured condition that originated this recommendation. */
  cause: { metric?: MetricId; value?: number | null; target?: Range | null; observedAt?: string; since?: string }
  /** Inert: nothing is executed and the person always decides. */
  proposal?: ProposedIntent
  requiresHuman: true
}

export interface PrimaryAction { kind: "configure_cultivation" | "check_device"; label: string; href: string }

export interface Summary { headline: string; detail: string; tone: Tone }

export interface IntelligenceReport {
  generatedAt: string
  /** Always "rules": nothing here was produced by a model. */
  source: "rules"
  connection: "live" | "stale" | "offline" | "unknown"
  current: { temperature: number | null; humidity: number | null; observedAt: string } | null
  targets: EnvTargets | null
  findings: Finding[]
  recommendations: Recommendation[]
  primaryAction: PrimaryAction | null
  summary: Summary
}

export interface Episode {
  id: string
  metric: MetricId
  direction: "low" | "high"
  startedAt: string
  endedAt: string | null
  extreme: number
  critical: boolean
}

export type ActivityKind = "out_of_range" | "signal_lost"
export interface ActivityEvent {
  id: string
  kind: ActivityKind
  severity: Severity
  title: string
  detail: string
  startedAt: string
  endedAt: string | null
}

/** Facts about the owner's active cultivation. Provided by the caller; absent when nothing is registered. */
export interface CultivationFacts {
  name: string
  speciesName: string
  scientificName: string
  stage: string
  stageLabel: string
  startedAt: string
  validation: "sample" | "experimental" | "validated"
  /** Who defined the ranges in use: the species profile or the owner. */
  rangesSource: "profile" | "owner"
  /** The owner explicitly confirmed the ranges. Required before any future automation. */
  targetsConfirmed: boolean
}

/** A species profile the assistant may mention. Only what exists in the catalog; nothing is invented. */
export interface CatalogEntry {
  name: string
  scientificName: string
  validation: "sample" | "experimental" | "validated"
  /** Example ranges of the profile's first stage, for orientation only. */
  example: { temperature?: Range; humidity?: Range } | null
}

export type MissingInfo =
  | "no_cultivation" | "targets_unconfirmed" | "profile_not_validated" | "no_actuators" | "sensors_limited" | "short_history"
