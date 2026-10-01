/**
 * MYKO individuality — "este MYKO es el mío".
 *
 * Two cultivations never draw an identical MYKO. A stable identity string
 * (the CultivationRun id) is hashed into a small set of bounded visual traits
 * that bend the geometry: curvature, lean, reach of some hyphae, where nodes
 * sit, how spores scatter. It is VISUAL IDENTITY ONLY:
 *
 * - deterministic (FNV-1a + mulberry32; never Math.random) → same run, same
 *   MYKO across reloads and on server and client;
 * - independent of mood, environment and stage (the signature only takes the
 *   identity string), so a dry chamber never changes who MYKO is;
 * - never persisted as "DNA" and never claimed to represent real biology.
 */
export interface MykoVisualTraits {
  /** 32-bit seed for per-element variation inside the geometry. */
  seed: number
  /** Whole-body lean, −1..1 (≈ ±5°). */
  lean: number
  /** How much hyphae bend, 0.75..1.3. */
  curl: number
  /** Reach of the mycelial mat, 0.9..1.1. */
  reach: number
  /** Left/right imbalance of the mat, −1..1 (one side explores further). */
  bias: number
  /** Where the upper structure opens towards, −1..1. */
  capTurn: number
  /** Extra secondary branches, 0..2 (bounded: the stage stays readable). */
  extraBranches: 0 | 1 | 2
  /** Phase used to distribute nodes and spores, 0..1. */
  phase: number
}

/** FNV-1a 32-bit. Integer-only, identical in every JS engine. */
export function hashIdentity(identity: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < identity.length; i++) {
    hash ^= identity.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32: tiny deterministic PRNG, values in [0, 1). */
export function createPrng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const quantize = (value: number) => Math.round(value * 1000) / 1000

/** Neutral traits (no identity yet, e.g. loading or thumbnails). */
export const NEUTRAL_MYKO_TRAITS: MykoVisualTraits = {
  seed: 0x9e3779b9,
  lean: 0,
  curl: 1,
  reach: 1,
  bias: 0,
  capTurn: 0.35,
  extraBranches: 0,
  phase: 0.5,
}

export function deriveMykoTraits(identity: string | null | undefined): MykoVisualTraits {
  if (!identity) return NEUTRAL_MYKO_TRAITS
  const seed = hashIdentity(identity)
  const next = createPrng(seed)
  const signed = () => next() * 2 - 1
  return {
    seed,
    lean: quantize(signed()),
    curl: quantize(0.75 + next() * 0.55),
    reach: quantize(0.9 + next() * 0.2),
    bias: quantize(signed()),
    capTurn: quantize(signed()),
    extraBranches: Math.floor(next() * 3) as 0 | 1 | 2,
    phase: quantize(next()),
  }
}
