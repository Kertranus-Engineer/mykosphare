import { cultivationDay, GROW_COPY, presentSpecies, stageLabel } from "@/lib/grow/presentation"
import type { GrowSnapshot } from "@/lib/grow/types"

/** "Ostra · Colonización · Día 11". Stage shown is always the CONFIRMED stage. */
export function RunHeading({ snapshot, now, showScientific = false }: { snapshot: GrowSnapshot; now: string; showScientific?: boolean }) {
  const species = presentSpecies(snapshot.profile)
  const day = cultivationDay(snapshot.run.startedAt, now)
  const meta = [stageLabel(snapshot.state.confirmedStage), day !== null ? GROW_COPY.stage.day(day) : null].filter(Boolean).join(" · ")
  return (
    <div>
      <p className="g-run-name">{species.name}</p>
      <p className="g-run-meta" style={{ margin: "4px 0 0" }}>{meta}</p>
      {showScientific && (
        <p className="g-muted" style={{ margin: "8px 0 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <i>{species.scientificName}</i>
          {species.isSample && <span className="g-tag">{GROW_COPY.species.sampleProfile}</span>}
        </p>
      )}
    </div>
  )
}
