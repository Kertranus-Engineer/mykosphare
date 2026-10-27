import type { GrowSnapshot, MykoForm, MykoViewModel } from "../types"
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

/** The two measured metrics with their domain condition (Home / face readouts). */
export function presentSenses(snapshot: GrowSnapshot): PresentedMetric[] {
  const { conditions, freshness } = snapshot.state
  return [
    presentMetric("temperature", conditions.temperature, freshness),
    presentMetric("humidity", conditions.humidity, freshness),
  ]
}

export const MYKO_FORM_ORDER: readonly MykoForm[] = ["early", "emerging", "mature", "complete"]

export interface PresentedDevelopment {
  forms: Array<{ form: MykoForm; name: string; status: "past" | "current" | "future" }>
  currentFormName: string
  stage: string
  day: number | null
}

/** Development follows the CONFIRMED stage only (via MykoViewModel.form). No XP, no levels. */
export function presentDevelopment(snapshot: GrowSnapshot, now: string | Date): PresentedDevelopment {
  const currentIndex = MYKO_FORM_ORDER.indexOf(snapshot.myko.form)
  return {
    forms: MYKO_FORM_ORDER.map((form, index) => ({
      form,
      name: GROW_COPY.myko.formNames[form],
      status: index < currentIndex ? "past" : index === currentIndex ? "current" : "future",
    })),
    currentFormName: GROW_COPY.myko.formNames[snapshot.myko.form],
    stage: stageLabel(snapshot.state.confirmedStage, snapshot.profile),
    day: cultivationDay(snapshot.run.startedAt, now),
  }
}
