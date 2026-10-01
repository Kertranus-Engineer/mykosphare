import type { MykoMood } from "../types"

/**
 * MYKO ACTIVITY — what MYKO is visibly doing right now. Pure PRESENTATION:
 * derived from what the viewer has observed (a new reading arriving, the mood
 * moving back to content, a tap). It never changes GrowState, never invents
 * data and is not the domain `MykoViewModel.activity` (reserved for future
 * interaction layers).
 *
 * "Offline" is deliberately NOT an activity: loss of signal is a freshness
 * fact already expressed by mood `uncertain`. While uncertain, MYKO is
 * `waiting`: it lost its senses, it is not ill — no sensing, no recovery,
 * no fake liveliness.
 */
export type MykoLiveActivity = "idle" | "sensing" | "recovering" | "touched" | "waiting"

export interface MykoActivityInput {
  mood: MykoMood
  /** Mood observed before the latest update in this session (null on first view). */
  previousMood: MykoMood | null
  /** True when a reading with a new timestamp just arrived. */
  signalChanged: boolean
  /** True right after the viewer tapped MYKO. */
  touched: boolean
}

/** Priority: touched > waiting > recovering > sensing > idle. */
export function resolveMykoActivity(input: MykoActivityInput): MykoLiveActivity {
  if (input.touched) return "touched"
  if (input.mood === "uncertain") return "waiting"
  // Recovery is claimed only when the data themselves moved back to content.
  if (input.mood === "content" && input.previousMood !== null && input.previousMood !== "content") return "recovering"
  if (input.signalChanged) return "sensing"
  return "idle"
}

/** How long each one-shot activity plays before returning to idle (ms). */
export const MYKO_ACTIVITY_DURATION: Record<MykoLiveActivity, number | null> = {
  idle: null,
  waiting: null,
  sensing: 1800,
  recovering: 3200,
  touched: 1100,
}
