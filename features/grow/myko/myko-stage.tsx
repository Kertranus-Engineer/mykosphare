"use client"

import { useMemo, useState } from "react"
import { GROW_COPY, type GrowDomain, type GrowIconKey, type GrowTone, type MykoLiveActivity } from "@/lib/grow/presentation"
import type { MykoViewModel } from "@/lib/grow/types"
import { GrowIcon } from "../glyphs/grow-glyphs"
import { MykoRenderer, type MykoMomentPhase, type MykoSenseMark } from "./myko-renderer"
import { deriveMykoTraits } from "./traits"
import { useMykoActivity } from "./use-myko-activity"

export interface MykoCue {
  icon: GrowIconKey
  domain: GrowDomain
  tone: GrowTone
}

/**
 * MYKO's stage: the organism, its light field and (optionally) the need cue
 * that makes the status "emanate" from it. Tapping plays a cosmetic reaction
 * ("it answered") — no AI, no state change. `onActivate` lets a page add
 * behaviour (e.g. /face opens its detail panel).
 *
 * `identity` (the CultivationRun id) makes this MYKO look like *this*
 * cultivation's MYKO; `signal` (last reading timestamp) lets MYKO visibly
 * sense when a new reading arrives.
 */
export function MykoStage({
  model,
  identity = null,
  senses,
  signal = null,
  activity,
  moment,
  still,
  cue = null,
  size = "hero",
  label,
  onActivate,
  expanded,
}: {
  model: MykoViewModel
  identity?: string | null
  senses?: readonly MykoSenseMark[]
  signal?: string | null
  /** Force an activity (Visual Lab only). */
  activity?: MykoLiveActivity
  moment?: MykoMomentPhase | null
  /** No motion (Visual Lab reduced-motion preview). */
  still?: boolean
  cue?: MykoCue | null
  size?: "hero" | "profile" | "face" | "compact"
  /** Accessible name for the tap target; required when interactive. */
  label?: string
  onActivate?: () => void
  expanded?: boolean
}) {
  const [reaction, setReaction] = useState(0)
  const traits = useMemo(() => deriveMykoTraits(identity), [identity])
  const observed = useMykoActivity({ mood: model.mood, signal, touches: reaction })
  const activate = () => {
    setReaction((value) => value + 1)
    onActivate?.()
  }

  return (
    <div className="myko-stage" data-size={size} data-mood={model.mood}>
      <div className="myko-stage-field" aria-hidden="true" />
      <button
        type="button"
        className="myko-stage-button"
        onClick={activate}
        aria-label={label ?? GROW_COPY.myko.tapHint}
        aria-expanded={expanded}
      >
        <MykoRenderer
          model={model}
          traits={traits}
          senses={senses}
          activity={activity ?? observed}
          moment={moment}
          still={still}
          reaction={reaction}
          decorative
        />
      </button>
      {cue && (
        <span className="myko-cue" data-tone={cue.tone} data-domain={cue.domain} aria-hidden="true">
          <GrowIcon icon={cue.icon} size={size === "face" ? 26 : 20} />
        </span>
      )}
    </div>
  )
}
