import { GROW_COPY, type PresentedStageJourney } from "@/lib/grow/presentation"
import { GlyphEvent } from "../glyphs/grow-glyphs"

/**
 * Discrete cycle track. The fill reaches the CONFIRMED stage only; a suggested
 * stage is a dashed node + note, never shown as current. No percentages.
 */
export function StageJourney({ journey }: { journey: PresentedStageJourney }) {
  const currentIndex = journey.steps.findIndex((step) => step.status === "current")
  const fill = `${(currentIndex / (journey.steps.length - 1)) * 84}%`
  return (
    <div className="g-journey">
      <div className="g-journey-current">
        <strong>{journey.current.label}</strong>
        <span className="g-muted" style={{ fontSize: "0.84rem" }}>{journey.current.position}</span>
      </div>
      <div>
        <ol className="g-track" aria-label={GROW_COPY.stage.journeyTitle}>
          <li className="g-track-fill" style={{ width: fill }} role="presentation" aria-hidden="true" />
          {journey.steps.map((step) => (
            <li
              key={step.stage}
              className="g-track-step"
              data-status={step.status}
              data-suggested={step.suggested}
              aria-current={step.status === "current" ? "step" : undefined}
              aria-label={`${step.label}${step.status === "current" ? ` — ${GROW_COPY.stage.current}` : step.status === "done" ? ` — ${GROW_COPY.stage.done}` : ""}${step.suggested ? ` — ${GROW_COPY.stage.suggested}` : ""}`}
            >
              <span className="g-track-node" />
            </li>
          ))}
        </ol>
        <ol className="g-track-labels" aria-hidden="true">
          {journey.steps.map((step) => (
            <li key={step.stage} data-status={step.status} data-suggested={step.suggested}>{step.label}</li>
          ))}
        </ol>
      </div>
      {journey.possibleChange && (
        <p className="g-notice" data-kind="suggestion">
          <GlyphEvent size={18} />
          <span>
            <strong style={{ color: "var(--grow-bone)" }}>{GROW_COPY.stage.possibleChange}: {journey.possibleChange.label}.</strong>{" "}
            {journey.possibleChange.body}
          </span>
        </p>
      )}
    </div>
  )
}
