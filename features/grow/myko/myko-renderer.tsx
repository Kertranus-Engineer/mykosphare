import { createElement } from "react"
import { describeMyko, type MykoLiveActivity } from "@/lib/grow/presentation"
import type { MykoMorphologyFamily, MykoViewModel } from "@/lib/grow/types"
import { SvgMyko, type MykoMomentPhase, type MykoSenseMark } from "./svg-myko"
import type { MykoVisualTraits } from "./traits"

export type { MykoMomentPhase, MykoSenseMark }

/**
 * Stable MYKO contract for pages — this is also the spec a future RiveMyko
 * implements (form/mood → state inputs, traits → per-instance bones/params,
 * activity & moment → triggers). Renderers receive ONLY the MykoViewModel plus
 * presentation inputs — never telemetry, thresholds or GrowState.
 */
export interface MykoRendererProps {
  model: MykoViewModel
  /** Visual identity of this cultivation (deriveMykoTraits(run.id)). */
  traits?: MykoVisualTraits
  /** What MYKO is visibly doing (presentation only). */
  activity?: MykoLiveActivity
  /** Installed senses only; absent hardware is never drawn. */
  senses?: readonly MykoSenseMark[]
  /** True when an adjacent text already states MYKO's status. */
  decorative?: boolean
  className?: string
  /** Increment to replay the touch reaction. Cosmetic; carries no state. */
  reaction?: number
  /** Evolution ceremony phase — Visual Lab only for now. */
  moment?: MykoMomentPhase | null
  /** Render without motion (thumbnails, form track). */
  still?: boolean
}

/**
 * MORPHOLOGY SEAM. MYKO's anatomy family comes from the organism profile
 * (`MykoViewModel.morphology`). Only the fungal anatomy exists; a future plant
 * family registers its own renderer here without touching the twin, the
 * domain or any page. Unimplemented families render the fungal anatomy.
 */
const MORPHOLOGY_RENDERERS: Record<MykoMorphologyFamily, typeof SvgMyko | null> = {
  fungal: SvgMyko,
  plant: null,
  flowering_plant: null,
}

export function mykoRendererFor(morphology: MykoMorphologyFamily | undefined): typeof SvgMyko {
  return MORPHOLOGY_RENDERERS[morphology ?? "fungal"] ?? SvgMyko
}

export function MykoRenderer({ model, ...rest }: MykoRendererProps) {
  // Renderers are module-level constants from the registry (never created per render).
  return createElement(mykoRendererFor(model.morphology), { model, label: describeMyko(model), ...rest })
}
