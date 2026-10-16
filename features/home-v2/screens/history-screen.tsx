"use client"

import { Activity, Clock, Images } from "lucide-react"
import { useState } from "react"

import { COPY } from "../copy"
import { useHomeV2 } from "../data/home-v2-provider"
import { ActivityTab } from "../components/historial/activity-tab"
import { ChartsTab } from "../components/historial/charts-tab"
import { PhotosTab } from "../components/historial/photos-tab"
import { Segmented, tabPanelProps } from "../components/ui/segmented"
import { Rise } from "../components/ui/surface"

type Tab = "activity" | "charts" | "photos"

const OPTIONS = [
  { id: "activity", label: COPY.historyPage.tabs.activity, icon: <Clock aria-hidden className="size-4" /> },
  { id: "charts", label: COPY.historyPage.tabs.charts, icon: <Activity aria-hidden className="size-4" /> },
  { id: "photos", label: COPY.historyPage.tabs.photos, icon: <Images aria-hidden className="size-4" /> },
] as const

/** Historial V2: activity feed, session charts and photos. Everything is read-only. */
export function HistoryScreen() {
  const [tab, setTab] = useState<Tab>("activity")
  const { mode } = useHomeV2()

  return (
    <div className="hv2-stack">
      <Rise i={0}>
        <header className="hv2-page-head">
          <h1 className="hv2-page-title">{COPY.historyPage.title}</h1>
          <p className="hv2-page-lead">{mode === "demo" ? COPY.historyPage.leadDemo : COPY.historyPage.lead}</p>
        </header>
      </Rise>
      <Rise i={1}>
        <Segmented options={OPTIONS} value={tab} onChange={setTab} label={COPY.historyPage.tabsLabel} idPrefix="hv2-history" />
      </Rise>
      <div key={tab} {...tabPanelProps("hv2-history", tab)} className="hv2-tab-panel">
        {tab === "activity" && <ActivityTab />}
        {tab === "charts" && <ChartsTab />}
        {tab === "photos" && <PhotosTab />}
      </div>
    </div>
  )
}
