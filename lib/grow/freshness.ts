import type { DeviceFreshness, FreshnessPolicy } from "./types"

export const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  staleAfterMs: 5 * 60 * 1000,
  offlineAfterMs: 30 * 60 * 1000,
}

export function evaluateFreshness(
  timestamp: string | null | undefined,
  now: string | Date,
  policy: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY,
): DeviceFreshness {
  const observedAt = timestamp ? new Date(timestamp).getTime() : Number.NaN
  const evaluatedAt = new Date(now).getTime()

  if (!Number.isFinite(observedAt) || !Number.isFinite(evaluatedAt)) return "unknown"
  if (policy.staleAfterMs < 0 || policy.offlineAfterMs < policy.staleAfterMs) return "unknown"

  const ageMs = evaluatedAt - observedAt
  if (ageMs < 0) return "unknown"
  if (ageMs >= policy.offlineAfterMs) return "offline"
  if (ageMs >= policy.staleAfterMs) return "stale"
  return "live"
}
