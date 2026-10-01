import type { MykoForm, MykoMood, MykoViewModel } from "@/lib/grow/types"
import type { MykoSenseMark } from "../myko/myko-renderer"

/**
 * VISUAL FIXTURES — development only (/grow/lab). These MykoViewModels exist to
 * inspect the renderer. They are not cultivation data, not simulation, and must
 * never be used by product screens.
 */
export const LAB_FORMS: readonly MykoForm[] = ["early", "emerging", "mature", "complete"]
export const LAB_MOODS: readonly MykoMood[] = ["content", "concerned", "distressed", "uncertain"]

const ATTENTION: Record<MykoMood, MykoViewModel["attention"]> = {
  content: "none",
  concerned: "notice",
  distressed: "urgent",
  uncertain: "unknown",
}

export function visualFixture(form: MykoForm, mood: MykoMood): MykoViewModel {
  return { form, mood, activity: "idle", attention: ATTENTION[mood], messageKey: "lab.visual-fixture", origin: null }
}

/** Fixture identities standing in for five different cultivation run ids. */
export const LAB_INDIVIDUALS = [
  { name: "MYKO A", identity: "lab-fixture-run-a" },
  { name: "MYKO B", identity: "lab-fixture-run-b" },
  { name: "MYKO C", identity: "lab-fixture-run-c" },
  { name: "MYKO D", identity: "lab-fixture-run-d" },
  { name: "MYKO E", identity: "lab-fixture-run-e" },
] as const

/**
 * The FULL sense system lit, as a visual fixture only. Production passes
 * presentBodySenses(snapshot): installed hardware only (today temperature and
 * humidity) — CO₂, vision and mass never appear there.
 */
export const LAB_ALL_SENSES: readonly MykoSenseMark[] = [
  { key: "temperature", state: "active", domain: "heat" },
  { key: "humidity", state: "active", domain: "water" },
  { key: "vision", state: "active", domain: "myko" },
  { key: "co2", state: "active", domain: "bio" },
  { key: "mass", state: "active", domain: "growth" },
]
