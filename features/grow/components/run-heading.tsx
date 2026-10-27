import { cultivationDay, GROW_COPY, presentSpecies, stageLabel } from "@/lib/grow/presentation"
import type { GrowSnapshot } from "@/lib/grow/types"
import { GlyphGrowth } from "../glyphs/grow-glyphs"

/** Crop identity: "Ostra" + "Colonización · Día 11". Stage is always the CONFIRMED one. */
export function RunHeading({ snapshot, now }: { snapshot: GrowSnapshot; now: string }) {
  const species = presentSpecies(snapshot.profile)
  const day = cultivationDay(snapshot.run.startedAt, now)
  return (
    <div className="g-crop">
      <p className="g-crop-name">{species.name}</p>
      <p className="g-crop-meta">
        <GlyphGrowth size={16} />
        {stageLabel(snapshot.state.confirmedStage, snapshot.profile)}
        {day !== null && <span aria-hidden="true">·</span>}
        {day !== null && GROW_COPY.stage.day(day)}
      </p>
    </div>
  )
}
