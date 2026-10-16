"use client"

import { Bell } from "lucide-react"
import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { RelativeTime } from "@/features/mobile/components/primitives"
import { useNow } from "@/features/mobile/use-now"
import { COPY } from "../../copy"
import { formatClock, formatDayHeading } from "../../data/format"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { HistoryEntryModel, HistoryKind } from "../../data/model"
import { CATEGORY_LABEL, EntryIcon } from "../ui/entry-icon"
import { Card, Chip, EmptyState } from "../ui/surface"

type Filter = "all" | HistoryKind
const FILTERS: Filter[] = ["all", "alert", "event", "crop"]

function Entry({ entry, showProvenance }: { entry: HistoryEntryModel; showProvenance: boolean }) {
  return (
    <li className="hv2-tl-item" data-tone={entry.tone} data-kind={entry.kind}>
      <EntryIcon category={entry.category} tone={entry.tone} />
      <div className="hv2-tl-text">
        <p className="hv2-tl-title">{entry.title}</p>
        {entry.detail && <p className="hv2-tl-detail">{entry.detail}</p>}
        <p className="hv2-tl-meta">
          <span className="hv2-tl-kind">{CATEGORY_LABEL[entry.category]}</span>
          {entry.day !== undefined && <span className="hv2-log-day">{COPY.crop.day(entry.day)}</span>}
          {entry.at === null ? (
            <span className="hv2-entry-active">{COPY.historyPage.activeNow}</span>
          ) : (
            <time dateTime={new Date(entry.at).toISOString()}>{formatClock(entry.at)}</time>
          )}
          {entry.at !== null && entry.kind === "event" && entry.category === "session" && <RelativeTime at={entry.at} />}
          {showProvenance && entry.simulated && <Chip tone="sim" className="hv2-chip--caps">{COPY.log.simulated}</Chip>}
        </p>
      </div>
      {entry.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- data URI / remote capture, no image loader configured
        <img src={entry.photoUrl} alt="" className="hv2-log-thumb" loading="lazy" decoding="async" />
      )}
    </li>
  )
}

function Group({ title, entries, active = false, showProvenance }: { title: string; entries: HistoryEntryModel[]; active?: boolean; showProvenance: boolean }) {
  if (entries.length === 0) return null
  return (
    <section className="hv2-tl-group" aria-label={title} data-active={active || undefined}>
      <h2 className="hv2-tl-heading">{title}</h2>
      <Card className="hv2-tl-card">
        <ol className="hv2-tl">
          {entries.map((entry) => (
            <Entry key={entry.id} entry={entry} showProvenance={showProvenance} />
          ))}
        </ol>
      </Card>
    </section>
  )
}

/** Alerts, environment events and the crop record on one visual timeline, grouped by date and filterable. */
export function ActivityTab() {
  const { history, mode } = useHomeV2()
  const [filter, setFilter] = useState<Filter>("all")
  // One flag instead of a "Simulado" tag on every row when nothing in the feed is real.
  const allSimulated = history.length > 0 && history.every((entry) => entry.simulated)

  // Null on the server and first paint, so "Hoy/Ayer" headings never disagree between server and client.
  const now = useNow(60_000)

  const groups = useMemo(() => {
    const visible = filter === "all" ? history : history.filter((entry) => entry.kind === filter)
    const active = visible.filter((entry) => entry.at === null)
    const byDay = new Map<string, HistoryEntryModel[]>()
    for (const entry of visible) {
      if (entry.at === null || now === null) continue
      const key = formatDayHeading(entry.at, now)
      byDay.set(key, [...(byDay.get(key) ?? []), entry])
    }
    // The crop's own day travels with the date when the entries state it ("Hoy · Día 11").
    const days = [...byDay.entries()].map(([heading, entries]) => {
      const day = entries.find((entry) => entry.day !== undefined)?.day
      return { heading: day !== undefined ? `${heading} · ${COPY.crop.day(day)}` : heading, entries }
    })
    return { visible, active, days }
  }, [history, filter, now])

  return (
    <div className="hv2-stack hv2-stack--tight">
      {allSimulated && <Chip tone="sim" className="hv2-chip--caps hv2-log-flag">{COPY.historyPage.allSimulated}</Chip>}
      <div role="group" aria-label={COPY.historyPage.filtersLabel} className="hv2-filters">
        {FILTERS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            className={cn("hv2-filter hv2-press", filter === id && "is-active")}
            onClick={() => setFilter(id)}
          >
            {COPY.historyPage.filters[id]}
          </button>
        ))}
      </div>

      {groups.visible.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon={<Bell className="size-5" />}
            title={filter === "all" ? COPY.historyPage.empty : COPY.historyPage.emptyFiltered}
            body={COPY.historyPage.emptyBody}
          />
        </Card>
      ) : (
        <>
          <Group title={COPY.historyPage.active} entries={groups.active} active showProvenance={!allSimulated} />
          {groups.days.map(({ heading, entries }) => (
            <Group key={heading} title={heading} entries={entries} showProvenance={!allSimulated} />
          ))}
        </>
      )}
      <p className="hv2-caption">{mode === "demo" ? COPY.historyPage.demoNote : COPY.historyPage.sessionNote}</p>
    </div>
  )
}
