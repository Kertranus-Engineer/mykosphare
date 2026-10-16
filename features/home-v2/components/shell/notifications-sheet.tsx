"use client"

import Link from "next/link"
import { BellOff } from "lucide-react"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { RelativeTime } from "@/features/mobile/components/primitives"
import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { EmptyState, ToneDot } from "../ui/surface"

const LIMIT = 30

/**
 * Active alerts and environment events, already resolved by the provider (the crop's own record, such as
 * photographs and observations, lives in Cultivo and Historial, not here). Demonstration entries come only
 * from the demo engine and are labelled by the description.
 */
export function NotificationsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { history, mode } = useHomeV2()
  const items = history.filter((entry) => entry.kind !== "crop").slice(0, LIMIT)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" lang="es" className="hv2-sheet max-h-[85dvh] gap-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pr-14">
          <SheetTitle className="hv2-sheet-title">{COPY.notifications.title}</SheetTitle>
          <SheetDescription className="hv2-sheet-desc">{mode === "demo" ? COPY.notifications.descriptionDemo : COPY.notifications.description}</SheetDescription>
        </SheetHeader>
        <div className="hv2-sheet-body">
          {items.length === 0 ? (
            <EmptyState compact icon={<BellOff className="size-5" />} title={COPY.notifications.emptyTitle} body={COPY.notifications.emptyBody} />
          ) : (
            <ol className="hv2-notice-list">
              {items.map((item) => (
                <li key={item.id} className="hv2-notice" data-tone={item.tone}>
                  <ToneDot tone={item.tone} />
                  <div className="hv2-notice-text">
                    <p className="hv2-notice-title">{item.title}</p>
                    {item.detail && <p className="hv2-notice-detail">{item.detail}</p>}
                    <p className="hv2-notice-meta">
                      {item.at === null ? COPY.notifications.active : <RelativeTime at={item.at} />}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <Link href="/dashboard/alerts" className="hv2-link-row hv2-press">
            {COPY.notifications.settings}
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
