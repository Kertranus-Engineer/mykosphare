import { GROW_COPY, type PresentedStageJourney } from "@/lib/grow/presentation"

export function StageJourney({ journey, horizontalOnDesktop = false }: { journey: PresentedStageJourney; horizontalOnDesktop?: boolean }) {
  return (
    <div className="g-stack">
      <ol className={horizontalOnDesktop ? "g-journey g-journey-horizontal" : "g-journey"} aria-label={GROW_COPY.stage.journeyTitle}>
        {journey.steps.map((step) => (
          <li
            key={step.stage}
            className="g-journey-step"
            data-status={step.status}
            data-suggested={step.suggested}
            aria-current={step.status === "current" ? "step" : undefined}
          >
            <span className="g-journey-node" aria-hidden="true" />
            <span>
              {step.label}
              {step.status === "current" && <span className="g-journey-flag">{GROW_COPY.stage.current}</span>}
              {step.suggested && <span className="g-journey-flag">{GROW_COPY.stage.suggested}</span>}
            </span>
          </li>
        ))}
      </ol>
      {journey.possibleChange && (
        <p className="g-notice" data-kind="suggestion">
          <span>
            <strong style={{ color: "var(--g-text)" }}>{GROW_COPY.stage.possibleChange}.</strong> {journey.possibleChange.body}
          </span>
        </p>
      )}
    </div>
  )
}
