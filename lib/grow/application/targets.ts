/**
 * Owner-defined environmental targets. Pure helpers (validation and building the stage-targets document); the
 * database part lives in targets-store.ts. A person's ranges are stored as a private profile derived from the
 * profile they started with, flagged `custom` and `confirmed_by_owner`. Nothing is inferred or "improved".
 */
export interface RangeInput { min: number; max: number }
export interface TargetsInput { temperature: RangeInput; humidity: RangeInput }

// Wide enough for any real room or chamber; narrow enough to catch typos. Not biological guidance.
const LIMITS = { temperature: { lo: 0, hi: 45, minWidth: 2 }, humidity: { lo: 10, hi: 100, minWidth: 5 } } as const

export type TargetsParse = { ok: true; value: TargetsInput } | { ok: false; error: string }

const isRange = (v: unknown): v is RangeInput =>
  !!v && typeof v === "object" && typeof (v as RangeInput).min === "number" && typeof (v as RangeInput).max === "number" &&
  Number.isFinite((v as RangeInput).min) && Number.isFinite((v as RangeInput).max)

export function parseTargets(body: Record<string, unknown>): TargetsParse {
  const out: Partial<TargetsInput> = {}
  for (const metric of ["temperature", "humidity"] as const) {
    const range = body[metric]
    if (!isRange(range)) return { ok: false, error: `${metric} must be { min, max }` }
    const { lo, hi, minWidth } = LIMITS[metric]
    const min = Math.round(range.min * 10) / 10
    const max = Math.round(range.max * 10) / 10
    if (min < lo || max > hi) return { ok: false, error: `${metric} must stay between ${lo} and ${hi}` }
    if (max - min < minWidth) return { ok: false, error: `${metric} range must be at least ${minWidth} wide` }
    out[metric] = { min, max }
  }
  return { ok: true, value: out as TargetsInput }
}

/** Copy of a profile's stage targets where ONLY the confirmed stage uses the owner's ranges. Critical limits are dropped, not invented. */
export function withOwnerStageTargets(base: unknown, stage: string, targets: TargetsInput): Record<string, unknown> {
  const doc = base && typeof base === "object" ? { ...(base as Record<string, unknown>) } : {}
  doc[stage] = { temperature: { ...targets.temperature }, humidity: { ...targets.humidity } }
  return doc
}

export interface CustomProfileMetadata { custom: true; owner_id: string; based_on: string; confirmed_by_owner: true; confirmed_at: string }

export function customMetadata(ownerId: string, basedOn: string, now: string): CustomProfileMetadata {
  return { custom: true, owner_id: ownerId, based_on: basedOn, confirmed_by_owner: true, confirmed_at: now }
}
