import type { MykoForm, MykoMood } from "@/lib/grow/types"

/**
 * MYKO visual grammar — FOUR independent dimensions.
 *
 *   FORM     (confirmed stage)              → anatomy: what exists.
 *   MOOD     (environment / freshness)      → posture, rhythm, aura, light.
 *   ACTIVITY (what MYKO is doing now)       → one-shot behaviours (sensing, touched…).
 *   TRAITS   (identity of this cultivation) → bounded geometric variation.
 *
 * SIGNATURE ANATOMY (present in every form, every mood, every individual):
 * a luminous NUCLEUS suspended inside an OPEN CRESCENT MEMBRANE — a "C" whose
 * mouth always faces the same side — joined to the mycelial network by a VEIN.
 * The C is the same organ throughout life: a pod (Espora) → its lip curls
 * (Brote) → it becomes a lateral hood sheltering the nucleus, like an oyster
 * mushroom's side-attached cap (Madurez) → the hood opens and the colony buds
 * satellite pods, each a small nucleus-in-a-C (Plenitud).
 *
 * Visual progression: ESPORA → NÚCLEO → ORGANISMO → COLONIA. This is only
 * MYKO's interpretation of the confirmed stage; it is not biology.
 */
export type MykoBodyKind = "pod" | "sprout" | "hooded" | "colony"

export interface MykoCrescentVisual {
  /** Mid-radius of the C around the nucleus. */
  radius: number
  /** Maximum thickness (at the back). */
  width: number
  /** Arc in degrees (0 = mouth side, 90 = down), drawn clockwise start → end. */
  start: number
  end: number
  /** How much the upper end grows outward (the lip that becomes the hood). */
  lip: number
}

export interface MykoHoodVisual {
  width: number
  height: number
  flare: number
  lobes: number
  gills: number
  rimLights: number
}

export interface MykoHyphaeVisual {
  /** Hyphae germinate from the pod membrane, or spread from the foot region on the substrate. */
  origin: "pod" | "foot"
  /** Half-width of the region hyphae are born from (never a single point). */
  baseHalf: number
  /** Primary directions in degrees (canonical orientation: mouth to the right). */
  directions: readonly number[]
  reach: readonly [number, number]
  branches: number
  /** Anastomoses: cross-links between neighbouring hyphae (a web, not roots). */
  links: number
  /** Glowing growing tips (young, exploring mycelium). */
  tips: number
  /** Gravity: how much hyphae bend into the substrate (fraction of length). */
  sink: number
  width: number
}

export interface MykoFormVisual {
  body: MykoBodyKind
  coreRadius: number
  crescent: MykoCrescentVisual
  hood: MykoHoodVisual | null
  /** Satellite pods connected by luminous routes (the colony). */
  satellites: number
  /** Primordia beads on the mat ("something is appearing"). */
  pins: number
  hyphae: MykoHyphaeVisual
  nodes: number
  spores: number
}

export const MYKO_GROUND_Y = 62

export const MYKO_FORM_VISUALS: Record<MykoForm, MykoFormVisual> = {
  // ESPORA — potential: a nucleus in an open pod sends a few germ hyphae into the substrate.
  early: {
    body: "pod", coreRadius: 12,
    crescent: { radius: 21, width: 11, start: 8, end: 290, lip: 0 },
    hood: null, satellites: 0, pins: 0,
    hyphae: { origin: "pod", baseHalf: 0, directions: [66, 92, 118, 146, 184], reach: [46, 86], branches: 3, links: 1, tips: 5, sink: 0.38, width: 1.9 },
    nodes: 2, spores: 0,
  },
  // BROTE — the pod rises on a sprout; its lip begins to curl over the nucleus; the mat reorganises.
  emerging: {
    body: "sprout", coreRadius: 12,
    crescent: { radius: 23, width: 10, start: 28, end: 318, lip: 0.55 },
    hood: null, satellites: 0, pins: 2,
    hyphae: { origin: "foot", baseHalf: 14, directions: [-8, 12, 34, 84, 156, 174, 194], reach: [50, 86], branches: 4, links: 2, tips: 3, sink: 0.1, width: 2.1 },
    nodes: 5, spores: 0,
  },
  // MADUREZ — the icon: the C has become a lateral hood sheltering the suspended nucleus.
  mature: {
    body: "hooded", coreRadius: 13,
    crescent: { radius: 30, width: 13, start: 30, end: 276, lip: 0.18 },
    hood: { width: 130, height: 30, flare: -12, lobes: 5, gills: 12, rimLights: 7 },
    satellites: 0, pins: 0,
    hyphae: { origin: "foot", baseHalf: 18, directions: [-12, 4, 18, 34, 78, 106, 150, 164, 178, 194], reach: [66, 100], branches: 7, links: 5, tips: 0, sink: 0.08, width: 2.3 },
    nodes: 7, spores: 3,
  },
  // PLENITUD — expansion: the hood opens and flares, the mouth widens, satellite pods bud: a colony.
  complete: {
    body: "colony", coreRadius: 14,
    crescent: { radius: 32, width: 14, start: 70, end: 278, lip: 0.18 },
    hood: { width: 160, height: 30, flare: 22, lobes: 7, gills: 17, rimLights: 12 },
    satellites: 2, pins: 0,
    hyphae: { origin: "foot", baseHalf: 24, directions: [-18, -4, 10, 24, 40, 80, 104, 140, 156, 170, 184, 198], reach: [74, 104], branches: 9, links: 7, tips: 0, sink: 0.08, width: 2.4 },
    nodes: 10, spores: 9,
  },
}

/** Posture is behaviour. `waiting` = lost its senses (offline / no data) — NOT ill. */
export type MykoPosture = "open" | "gathered" | "defensive" | "waiting"
export type MykoHalo = "none" | "attention" | "critical"
export type MykoRhythm = "calm" | "uneven" | "tense" | "slow"

export interface MykoMoodVisual {
  posture: MykoPosture
  halo: MykoHalo
  rhythm: MykoRhythm
  /** Seconds per breath. */
  breath: number
  spores: boolean
  /** 0..1 overall light level; identity colours stay, only intensity changes. */
  light: number
}

export const MYKO_MOOD_VISUALS: Record<MykoMood, MykoMoodVisual> = {
  content: { posture: "open", halo: "none", rhythm: "calm", breath: 8, spores: true, light: 1 },
  concerned: { posture: "gathered", halo: "attention", rhythm: "uneven", breath: 5, spores: true, light: 0.92 },
  distressed: { posture: "defensive", halo: "critical", rhythm: "tense", breath: 2.6, spores: false, light: 0.9 },
  uncertain: { posture: "waiting", halo: "none", rhythm: "slow", breath: 12, spores: false, light: 0.55 },
}

export function mykoFormVisual(form: MykoForm): MykoFormVisual {
  return MYKO_FORM_VISUALS[form]
}

export function mykoMoodVisual(mood: MykoMood): MykoMoodVisual {
  return MYKO_MOOD_VISUALS[mood]
}
