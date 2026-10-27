import type { IntelligenceConfig } from "./types"

/**
 * Defaults tuned for an ESP32 that reports about every 30 s. Every threshold is an explicit,
 * overridable number; nothing is hidden inside the rules.
 */
export const DEFAULT_INTELLIGENCE_CONFIG: IntelligenceConfig = {
  freshness: { staleAfterMs: 2 * 60_000, offlineAfterMs: 5 * 60_000 },
  hysteresis: { temperature: 0.5, humidity: 2 },
  persistence: { samples: 3, minMs: 60_000 },
  rapidChange: { windowMs: 10 * 60_000, minSpanMs: 3 * 60_000, temperature: 3, humidity: 15 },
  physicalBounds: { temperature: [-40, 85], humidity: [0, 100] },
  maxSampleJump: { temperature: 15, humidity: 40 },
}

/** The 24 h history is stored as 5-minute averages, so persistence is expressed in those buckets. */
export const HISTORY_INTELLIGENCE_CONFIG: IntelligenceConfig = {
  ...DEFAULT_INTELLIGENCE_CONFIG,
  persistence: { samples: 2, minMs: 5 * 60_000 },
}

export function withConfig(overrides?: Partial<IntelligenceConfig>): IntelligenceConfig {
  return { ...DEFAULT_INTELLIGENCE_CONFIG, ...overrides }
}
