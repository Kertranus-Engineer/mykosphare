"use client"

import { Check } from "lucide-react"
import { useEffect, useRef, type CSSProperties } from "react"

import { COPY } from "../../copy"
import { formatDate } from "../../data/format"
import { useHomeV2 } from "../../data/home-v2-provider"
import { Card, Chip, SectionHeading } from "../ui/surface"

const STATUS_LABEL = { done: COPY.stages.done, current: COPY.stages.current, upcoming: COPY.stages.upcoming } as const

/**
 * Cycle stages for THIS crop (from its species profile). Shows the registered
 * stage and elapsed time; the elapsed-days heuristic is only ever an estimate
 * and there is deliberately no percentage anywhere.
 */
export function StageTrack() {
  const { cultivation } = useHomeV2()
  const listRef = useRef<HTMLOListElement>(null)
  const ready = cultivation.status === "ready"

  useEffect(() => {
    const list = listRef.current
    const current = list?.querySelector<HTMLElement>('[aria-current="step"]')
    if (!list || !current) return
    list.scrollLeft = current.offsetLeft - (list.clientWidth - current.clientWidth) / 2
  }, [ready])

  if (cultivation.status !== "ready") return null
  const { steps, stage, possibleChange } = cultivation

  return (
    <section aria-labelledby="hv2-stages-h" className="hv2-block">
      <SectionHeading id="hv2-stages-h" title={COPY.stages.title} />
      <Card className="hv2-stages-card">
        <ol ref={listRef} className="hv2-stages">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="hv2-step"
              data-status={step.status}
              aria-current={step.status === "current" ? "step" : undefined}
              style={{ "--i": index } as CSSProperties}
            >
              <span className="hv2-step-dot" aria-hidden>
                {step.status === "done" ? <Check className="size-4" strokeWidth={3} /> : index + 1}
              </span>
              <span className="hv2-step-label">{step.label}</span>
              <span className="hv2-step-state">{STATUS_LABEL[step.status]}</span>
              {step.estimated && <Chip tone="sim">{COPY.crop.estimate}</Chip>}
            </li>
          ))}
        </ol>

        <p className="hv2-stage-summary">
          <strong>{COPY.crop.stagePosition(stage.position, stage.total)}</strong>
          {stage.confirmedAt && <> · <time dateTime={stage.confirmedAt}>{formatDate(stage.confirmedAt)}</time></>}
        </p>

        {possibleChange && (
          <p className="hv2-callout" data-tone="sim">
            <Chip tone="sim" className="hv2-chip--caps">{COPY.crop.estimate}</Chip>
            {COPY.crop.possibleChange(possibleChange.label)}
          </p>
        )}
        <p className="hv2-caption">{COPY.stages.planNote}</p>
      </Card>
    </section>
  )
}
