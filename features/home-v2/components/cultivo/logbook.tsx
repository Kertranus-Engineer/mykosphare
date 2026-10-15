"use client"

import { NotebookPen, ScrollText } from "lucide-react"
import { useState } from "react"

import { COPY } from "../../copy"
import { formatDateTime, isoOrUndefined } from "../../data/format"
import { useHomeV2 } from "../../data/home-v2-provider"
import { useFeedback } from "../feedback"
import { Card, Chip, EmptyState, SectionHeading, ToneDot } from "../ui/surface"

const COLLAPSED = 5

/** Logbook fed only by facts the run record / event sources already provide. */
export function Logbook() {
  const { cultivation } = useHomeV2()
  const { notify } = useFeedback()
  const [expanded, setExpanded] = useState(false)
  const entries = cultivation.status === "ready" ? cultivation.log : []
  const visible = expanded ? entries : entries.slice(0, COLLAPSED)
  // One note instead of a "Simulado" tag on every row when nothing is real.
  const allSimulated = entries.length > 0 && entries.every((entry) => entry.provenance === "simulated")

  return (
    <section aria-labelledby="hv2-log-h" className="hv2-block">
      <SectionHeading
        id="hv2-log-h"
        title={COPY.log.title}
        action={
          <button
            type="button"
            className="hv2-button hv2-button--ghost hv2-button--small hv2-press"
            onClick={() => notify({ message: COPY.log.addNoteSoon })}
          >
            <NotebookPen aria-hidden className="size-4" />
            {COPY.log.addNote}
          </button>
        }
      />
      <Card className="hv2-log-card">
        {entries.length === 0 ? (
          <EmptyState compact icon={<ScrollText className="size-5" />} title={COPY.log.empty} body={COPY.log.emptyBody} />
        ) : (
          <>
            {allSimulated && <Chip tone="sim" className="hv2-chip--caps hv2-log-flag">{COPY.log.allSimulated}</Chip>}
            <ol className="hv2-log">
              {visible.map((entry) => (
                <li key={entry.id} className="hv2-log-item" data-tone={entry.tone}>
                  <ToneDot tone={entry.tone} />
                  <div className="hv2-log-text">
                    <p className="hv2-log-title">{entry.title}</p>
                    <p className="hv2-log-meta">
                      <time dateTime={isoOrUndefined(entry.at)}>{formatDateTime(entry.at)}</time>
                      {!allSimulated && entry.provenance === "simulated" && <Chip tone="sim" className="hv2-chip--caps">{COPY.log.simulated}</Chip>}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {entries.length > COLLAPSED && (
              <button type="button" className="hv2-button hv2-button--ghost hv2-button--block hv2-press" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                {expanded ? "Ver menos" : `Ver todo (${entries.length})`}
              </button>
            )}
          </>
        )}
      </Card>
    </section>
  )
}
