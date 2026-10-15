"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, Ellipsis, House, Leaf, Sprout, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { labHref, LAB_ROUTES } from "../../data/lab-request"

interface Tab {
  id: string
  label: string
  icon: LucideIcon
  /** Lab tabs live in the design lab; the rest open the current HOME (V2 pending). */
  href: string
  lab: boolean
}

const TABS: Tab[] = [
  { id: "home", label: COPY.nav.home, icon: House, href: LAB_ROUTES.home, lab: true },
  { id: "crop", label: COPY.nav.crop, icon: Sprout, href: LAB_ROUTES.crop, lab: true },
  { id: "environment", label: COPY.nav.environment, icon: Leaf, href: LAB_ROUTES.environment, lab: true },
  { id: "history", label: COPY.nav.history, icon: Clock, href: LAB_ROUTES.history, lab: true },
  { id: "more", label: COPY.nav.more, icon: Ellipsis, href: "/home/more", lab: false },
]

export function BottomNav() {
  const pathname = usePathname()
  const { request } = useHomeV2()
  // Exact match for Inicio so it does not light up on /cultivo.
  const activeIndex = TABS.findIndex((tab) => tab.lab && (tab.href === LAB_ROUTES.home ? pathname === tab.href : pathname.startsWith(tab.href)))

  return (
    <nav aria-label={COPY.nav.label} className="hv2-nav">
      <ul className="hv2-nav-list" style={{ "--tab": Math.max(activeIndex, 0) } as React.CSSProperties} data-active={activeIndex >= 0 ? "true" : "false"}>
        <li aria-hidden className="hv2-nav-indicator" />
        {TABS.map((tab, index) => {
          const active = index === activeIndex
          const Icon = tab.icon
          return (
            <li key={tab.id} className="hv2-nav-item">
              <Link
                href={tab.lab ? labHref(tab.href, request) : tab.href}
                aria-current={active ? "page" : undefined}
                aria-label={tab.lab ? undefined : `${tab.label} (${COPY.nav.legacyHint})`}
                className={cn("hv2-nav-link hv2-press", active && "is-active")}
              >
                <span className="hv2-nav-icon"><Icon aria-hidden className="size-[22px]" /></span>
                <span className="hv2-nav-label">{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
