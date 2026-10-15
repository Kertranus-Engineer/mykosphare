"use client"

import { Bell } from "lucide-react"
import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { RelativeTime } from "@/features/mobile/components/primitives"
import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { HistoryEntryModel, HistoryKind } from "../../data/model"
import { Card, Chip, EmptyState, ToneDot } from "../ui/surface"

type Filter = "all" | HistoryKind
const FILTERS: Filter[] = ["all", "alert", "event"]

function Entry({ entry }: { entry: HistoryEntryModel }) {
  return (
    <li className="hv2-notice" data-tone={entry.tone}>
      <ToneDot tone={entry.tone} />
      <div className="hv2-notice-text">
        <p className="hv2-notice-title">{entry.title}</p>
        {entry.detail && <p className="hv2-notice-detail">{entry.detail}</p>}
        <p className="hv2-notice-meta hv2-entry-meta">
          <span className="hv2-entry-kind">{COPY.historyPage.kind[entry.kind]}</span>
          <span aria-hidden>·</span>
          {entry.at === null ? (
            <span className="hv2-entry-active">{COPY.historyPage.activeNow}</span>
          ) : (
            <RelativeTime at={entry.at} />
          )}
          {entry.simulated && <Chip tone="sim" className="hv2-chip--caps">{COPY.log.simulated}</Chip>}
        </p>
      </div>
    </li>
  )
}

function Group({ title, entries }: { title: string; entries: HistoryEntryModel[] }) {
  if (entries.length === 0) return null
  return (
    <Card className="hv2-history-group">
      <h2 className="hv2-eyebrow hv2-group-title">{title}</h2>
      <ol className="hv2-notice-list">
        {entries.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </ol>
    </Card>
  )
}

/** Session activity and crop logbook in one feed, filterable. */
export function ActivityTab() {
  const { history } = useHomeV2()
  const [filter, setFilter] = useState<Filter>("all")

  const visible = useMemo(() => (filter === "all" ? history : history.filter((entry) => entry.kind === filter)), [history, filter])
  const active = visible.filter((entry) => entry.at === null)
  const recent = visible.filter((entry) => entry.at !== null)

  return (
    <div className="hv2-stack hv2-stack--tight">
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

      {visible.length === 0 ? (
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
          <Group title={COPY.historyPage.active} entries={active} />
          <Group title={COPY.historyPage.recent} entries={recent} />
        </>
      )}
      <p className="hv2-caption">{COPY.historyPage.sessionNote}</p>
    </div>
  )
}
