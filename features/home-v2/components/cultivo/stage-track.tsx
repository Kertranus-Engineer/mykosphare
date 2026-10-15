"use client"

import { Check } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"

import { COPY } from "../../copy"
import { formatDate } from "../../data/format"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { StageStepModel } from "../../data/model"
import { Card, Chip, SectionHeading } from "../ui/surface"

const STATUS_LABEL = { done: COPY.stages.done, current: COPY.stages.current, upcoming: COPY.stages.upcoming } as const

/** Which sides of a horizontal scroller still have content, so the edge fades only appear where they are true. */
function useScrollEdges(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [edges, setEdges] = useState({ start: false, end: false })
  const update = useCallback(() => {
    const node = ref.current
    if (!node) return
    const start = node.scrollLeft > 4
    const end = node.scrollLeft + node.clientWidth < node.scrollWidth - 4
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [ref])

  useEffect(() => {
    const node = ref.current
    if (!enabled || !node) return
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    node.addEventListener("scroll", update, { passive: true })
    return () => {
      observer.disconnect()
      node.removeEventListener("scroll", update)
    }
  }, [ref, update, enabled])

  return edges
}

function detailFor(step: StageStepModel, confirmedAt: string | null): string {
  if (step.status === "current") return COPY.stages.currentDetail(confirmedAt ? formatDate(confirmedAt) : null)
  if (step.status === "done") return COPY.stages.doneDetail
  return step.estimated ? COPY.stages.estimatedDetail : COPY.stages.upcomingDetail
}

/**
 * Cycle stages for THIS crop (from its species profile) as a horizontal,
 * snap-scrolling carousel focused on the registered stage. Tapping a stage
 * explains it. The elapsed-days heuristic is only ever an estimate and there is
 * deliberately no percentage anywhere.
 */
export function StageTrack() {
  const { cultivation } = useHomeV2()
  const listRef = useRef<HTMLOListElement>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const ready = cultivation.status === "ready"
  const edges = useScrollEdges(listRef, ready)

  const center = useCallback((id: string, smooth: boolean) => {
    const list = listRef.current
    const node = list?.querySelector<HTMLElement>(`[data-step="${id}"]`)
    if (!list || !node) return
    list.scrollTo({ left: node.offsetLeft - (list.clientWidth - node.clientWidth) / 2, behavior: smooth ? "smooth" : "auto" })
  }, [])

  const currentId = ready ? cultivation.steps.find((step) => step.status === "current")?.id : undefined
  useEffect(() => {
    if (currentId) center(currentId, false)
  }, [currentId, center])

  if (cultivation.status !== "ready") return null
  const { steps, stage, possibleChange } = cultivation
  const selected = steps.find((step) => step.id === (picked ?? currentId)) ?? steps[0]
  const overflow = edges.start || edges.end

  return (
    <section aria-labelledby="hv2-stages-h" className="hv2-block">
      <SectionHeading
        id="hv2-stages-h"
        title={COPY.stages.title}
        action={<span className="hv2-stages-pos">{COPY.crop.stagePosition(stage.position, stage.total)}</span>}
      />
      <Card className="hv2-stages-card">
        {/* Compact progress by stage count (not a percentage): one segment per stage. */}
        <ol className="hv2-segments" aria-hidden>
          {steps.map((step) => (
            <li key={step.id} className="hv2-segment" data-status={step.status} data-estimated={step.estimated || undefined} />
          ))}
        </ol>

        <div className="hv2-stages-wrap" data-start={edges.start || undefined} data-end={edges.end || undefined}>
          <ol ref={listRef} className="hv2-stages" aria-label={COPY.stages.listLabel}>
            {steps.map((step, index) => (
              <li key={step.id} className="hv2-step" data-status={step.status} data-step={step.id} style={{ "--i": index } as CSSProperties}>
                <button
                  type="button"
                  className="hv2-step-btn hv2-press"
                  aria-pressed={selected.id === step.id}
                  aria-current={step.status === "current" ? "step" : undefined}
                  aria-label={`${step.label}. ${STATUS_LABEL[step.status]}${step.estimated ? `. ${COPY.crop.estimate}` : ""}`}
                  onClick={() => {
                    setPicked(step.id)
                    center(step.id, true)
                  }}
                >
                  <span className="hv2-step-dot" aria-hidden>
                    {step.status === "done" ? <Check className="size-4" strokeWidth={3} /> : index + 1}
                  </span>
                  <span className="hv2-step-label">{step.label}</span>
                  {step.estimated && <Chip tone="sim" className="hv2-chip--caps">{COPY.crop.estimate}</Chip>}
                </button>
              </li>
            ))}
          </ol>
        </div>

        {overflow && <p className="hv2-stages-hint" aria-hidden>{COPY.stages.hint}</p>}

        <p className="hv2-stage-detail" aria-live="polite" key={selected.id}>
          <strong>{selected.label}</strong>
          <span> · {detailFor(selected, stage.confirmedAt)}</span>
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
