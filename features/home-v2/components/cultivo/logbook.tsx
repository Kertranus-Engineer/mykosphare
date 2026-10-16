"use client"

import { ScrollText } from "lucide-react"
import { useMemo, useState } from "react"

import { cultivationDay } from "@/lib/grow/presentation"
import { COPY } from "../../copy"
import { formatDateTime, isoOrUndefined } from "../../data/format"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { LogEntryModel } from "../../data/model"
import { CATEGORY_LABEL, EntryIcon } from "../ui/entry-icon"
import { Card, Chip, EmptyState, SectionHeading } from "../ui/surface"

const COLLAPSED = 6

/**
 * Logbook of THIS crop: date, type, description and provenance of every record. In the
 * demonstration it tells the example story (photos, observations, stage, environment);
 * with a real crop it shows only what the run record provides.
 */
export function Logbook() {
  const { cultivation, photos } = useHomeV2()
  const [expanded, setExpanded] = useState(false)

  const thumbs = useMemo(() => {
    const map = new Map<string, string>()
    if (photos.status === "ready") for (const photo of photos.items) map.set(photo.id, photo.thumbUrl ?? photo.url)
    return map
  }, [photos])

  if (cultivation.status !== "ready") return null

  const entries = cultivation.log
  const visible = expanded ? entries : entries.slice(0, COLLAPSED)
  // One note instead of a "Simulado" tag on every row when nothing is real.
  const allSimulated = entries.length > 0 && entries.every((entry) => entry.provenance === "simulated")

  return (
    <section aria-labelledby="hv2-log-h" className="hv2-block">
      <SectionHeading
        id="hv2-log-h"
        title={COPY.log.title}
        action={entries.length > 0 ? <span className="hv2-stages-pos">{COPY.log.count(entries.length)}</span> : undefined}
      />
      <Card className="hv2-log-card">
        {entries.length === 0 ? (
          <EmptyState compact icon={<ScrollText className="size-5" />} title={COPY.log.empty} body={COPY.log.emptyBody} />
        ) : (
          <>
            {allSimulated && <Chip tone="sim" className="hv2-chip--caps hv2-log-flag">{COPY.log.allSimulated}</Chip>}
            <ol className="hv2-log">
              {visible.map((entry) => (
                <LogItem
                  key={entry.id}
                  entry={entry}
                  day={entry.day ?? cultivationDay(cultivation.startedAt, entry.at)}
                  thumb={entry.photoId ? thumbs.get(entry.photoId) : undefined}
                  showProvenance={!allSimulated}
                />
              ))}
            </ol>
            {entries.length > COLLAPSED && (
              <button type="button" className="hv2-button hv2-button--ghost hv2-button--block hv2-press" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                {expanded ? "Ver menos" : `Ver todo (${entries.length})`}
              </button>
            )}
          </>
        )}
        <p className="hv2-caption hv2-log-foot">{COPY.log.notesSoon}</p>
      </Card>
    </section>
  )
}

function LogItem({ entry, day, thumb, showProvenance }: { entry: LogEntryModel; day: number | null; thumb?: string; showProvenance: boolean }) {
  return (
    <li className="hv2-log-item" data-tone={entry.tone} data-kind={entry.kind}>
      <EntryIcon category={entry.kind} tone={entry.tone} />
      <div className="hv2-log-text">
        <p className="hv2-log-title">{entry.title}</p>
        {entry.detail && <p className="hv2-log-detail">{entry.detail}</p>}
        <p className="hv2-log-meta">
          <span className="hv2-log-kind">{CATEGORY_LABEL[entry.kind]}</span>
          {day !== null && <span className="hv2-log-day">{COPY.crop.day(day)}</span>}
          <time dateTime={isoOrUndefined(entry.at)}>{formatDateTime(entry.at)}</time>
          {showProvenance && entry.provenance === "simulated" && <Chip tone="sim" className="hv2-chip--caps">{COPY.log.simulated}</Chip>}
        </p>
      </div>
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element -- data URI / remote capture, no image loader configured
        <img src={thumb} alt="" className="hv2-log-thumb" loading="lazy" decoding="async" />
      )}
    </li>
  )
}
