import type { MykoForm } from "@/lib/grow/types"
import type { MykoMomentPhase } from "../myko/myko-renderer"
import { LAB_FORMS } from "./visual-fixtures"

/**
 * EVOLUTION CEREMONY — Visual Lab preview only.
 *
 * A pure plan over MYKO forms: it takes a form and returns timed phases. It
 * has no access to a CultivationRun, GrowState or stage suggestions and cannot
 * change them. The future product trigger is ONLY a persisted `stage_confirmed`
 * event (see docs/architecture/grow-experience.md).
 *
 *   charge  (~0.9 s): nucleus gains energy, hyphae retract slightly
 *   emerge  (~1.6 s): light pulse, the new structure grows in, the network
 *                     expands, particles — then rest in the new form.
 */
export interface EvolutionStep {
  phase: MykoMomentPhase
  form: MykoForm
  durationMs: number
}

export interface EvolutionPlan {
  from: MykoForm
  to: MykoForm
  steps: readonly EvolutionStep[]
  totalMs: number
}

export const EVOLUTION_CHARGE_MS = 900
export const EVOLUTION_EMERGE_MS = 1600

export function nextForm(form: MykoForm): MykoForm | null {
  const index = LAB_FORMS.indexOf(form)
  return index >= 0 && index < LAB_FORMS.length - 1 ? LAB_FORMS[index + 1] : null
}

export function previousForm(form: MykoForm): MykoForm | null {
  const index = LAB_FORMS.indexOf(form)
  return index > 0 ? LAB_FORMS[index - 1] : null
}

export function planEvolution(from: MykoForm): EvolutionPlan | null {
  const to = nextForm(from)
  if (!to) return null
  const steps: EvolutionStep[] = [
    { phase: "charge", form: from, durationMs: EVOLUTION_CHARGE_MS },
    { phase: "emerge", form: to, durationMs: EVOLUTION_EMERGE_MS },
  ]
  return { from, to, steps, totalMs: EVOLUTION_CHARGE_MS + EVOLUTION_EMERGE_MS }
}
