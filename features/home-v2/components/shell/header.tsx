"use client"

import Link from "next/link"
import { Bell, Settings } from "lucide-react"
import { useState } from "react"

import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { labHref, LAB_ROUTES } from "../../data/lab-request"
import { ToneDot } from "../ui/surface"
import { BrandMark } from "../ui/brand-mark"
import { NotificationsSheet } from "./notifications-sheet"
import { SettingsSheet } from "./settings-sheet"

function ConnectionChip() {
  const { device } = useHomeV2()
  return (
    <span role="status" className="hv2-conn" data-tone={device.tone} aria-label={`Estado de conexión: ${device.label}`}>
      <ToneDot tone={device.tone} pulse={device.kind === "live"} />
      <span className="hv2-conn-label">{device.label}</span>
    </span>
  )
}

export function Header() {
  const { request, attentionCount } = useHomeV2()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <header className="hv2-header">
      <div className="hv2-header-inner">
        <Link href={labHref(LAB_ROUTES.home, request)} className="hv2-brand" aria-label={`${COPY.brand} — ${COPY.nav.home}`}>
          <span className="hv2-brand-mark"><BrandMark className="size-5" /></span>
          <span className="hv2-wordmark">{COPY.brand}</span>
        </Link>

        <div className="hv2-header-end">
          <ConnectionChip />
          <button
            type="button"
            className="hv2-icon-button hv2-press"
            onClick={() => setNotificationsOpen(true)}
            aria-label={attentionCount > 0 ? COPY.header.notificationsActive(attentionCount) : COPY.header.notifications}
          >
            <Bell aria-hidden className="size-5" />
            {attentionCount > 0 && <span className="hv2-badge-count" aria-hidden>{attentionCount}</span>}
          </button>
          <button type="button" className="hv2-icon-button hv2-press" onClick={() => setSettingsOpen(true)} aria-label={COPY.header.settings}>
            <Settings aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  )
}
