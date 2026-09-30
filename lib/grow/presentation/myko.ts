import type { GrowSnapshot, MykoViewModel } from "../types"
import { GROW_COPY } from "./copy.es"
import { presentMetric, type PresentedMetric } from "./metrics"
import { cultivationDay, stageLabel } from "./stage"

/** Accessible description of MYKO; never the only carrier of state. */
export function describeMyko(model: MykoViewModel): string {
  return GROW_COPY.myko.label(GROW_COPY.myko.forms[model.form], GROW_COPY.myko.moods[model.mood])
}

export function presentMood(model: MykoViewModel): string {
  return GROW_COPY.myko.moods[model.mood]
}

/** What MYKO can currently sense: the measured metrics with their semantic condition. */
export function presentSenses(snapshot: GrowSnapshot): PresentedMetric[] {
  const { conditions, freshness } = snapshot.state
  return [
    presentMetric("temperature", conditions.temperature, freshness),
    presentMetric("humidity", conditions.humidity, freshness),
  ]
}

/** Facts MYKO holds about the run, phrased for a person. */
export function presentKnowledge(snapshot: GrowSnapshot, now: string | Date): string[] {
  const facts = [GROW_COPY.myko.knowStage(stageLabel(snapshot.state.confirmedStage).toLowerCase())]
  const day = cultivationDay(snapshot.run.startedAt, now)
  if (day !== null) facts.push(GROW_COPY.myko.knowDay(day))
  if (snapshot.profile.kind === "sample") facts.push(GROW_COPY.myko.knowSample)
  return facts
}

/**
 * Product capability manifest v0: things MYKOSPHARE does not observe yet.
 * Presented as honest limits, not as errors or missing values.
 */
export const UNOBSERVED_CAPABILITIES = [
  { key: "co2", ...GROW_COPY.capabilities.co2 },
  { key: "visual", ...GROW_COPY.capabilities.visual },
  { key: "contamination", ...GROW_COPY.capabilities.contamination },
] as const
