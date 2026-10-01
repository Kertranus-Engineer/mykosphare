"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { Home, Menu } from "lucide-react"
import { GROW_DEMO_SCENARIOS } from "@/lib/grow/demo/simulation-demo"
import { GROW_COPY, presentSource } from "@/lib/grow/presentation"
import { useGrow } from "../data/grow-provider"
import { growHref, type GrowRequest } from "../data/grow-request"
import { GlyphGrowth, GlyphMyko } from "../glyphs/grow-glyphs"
import { SourceBadge } from "./source-badge"

const NAV = [
  { path: "/grow", label: GROW_COPY.nav.home, icon: Home },
  { path: "/grow/cultivation", label: GROW_COPY.nav.cultivation, icon: GlyphGrowth },
  { path: "/grow/myko", label: GROW_COPY.nav.myko, icon: GlyphMyko },
] as const

function NavLinks({ request, pathname, className }: { request: GrowRequest; pathname: string; className: string }) {
  return (
    <nav className={className} aria-label={GROW_COPY.nav.primary}>
      {NAV.map(({ path, label, icon: Icon }) => {
        const active = pathname === path
        return (
          <Link key={path} href={growHref(path, request)} className="g-nav-link" aria-current={active ? "page" : undefined}>
            <Icon className="size-5" aria-hidden="true" />
            <span>{label}</span>
                      </Link>
        )
      })}
    </nav>
  )
}

function GrowMenu({ request }: { request: GrowRequest }) {
  return (
    <details className="g-menu">
      <summary aria-label={GROW_COPY.nav.menu}>
        <Menu className="size-5" aria-hidden="true" />
      </summary>
      <div className="g-menu-panel">
        <Link className="g-menu-item" href={growHref("/face", request)}>{GROW_COPY.nav.face}</Link>
        {request.kind === "simulation" && (
          <>
            <p className="g-menu-section">{GROW_COPY.nav.demoScenarios}</p>
            <div className="g-menu-chips">
              {GROW_DEMO_SCENARIOS.map((scenario) => (
                <Link
                  key={scenario}
                  className="g-chip-link"
                  aria-current={request.scenario === scenario ? "true" : undefined}
                  href={growHref("/grow", { ...request, scenario, notices: [] })}
                >
                  {GROW_COPY.demo.scenarios[scenario]}
                </Link>
              ))}
            </div>
          </>
        )}
        <a className="g-menu-item g-menu-item-secondary" href="/dashboard">{GROW_COPY.nav.engineering}</a>
      </div>
    </details>
  )
}

export function GrowShell({ children }: { children: ReactNode }) {
  const { request, view } = useGrow()
  const pathname = usePathname()
  const origin = view.status === "ready" ? view.snapshot.state.origin : null
  const source = view.mode ? presentSource(view.mode, origin) : null

  return (
    <div className="g-shell">
      <header className="g-header">
        <Link href={growHref("/grow", request)} className="g-wordmark"><GlyphMyko size={18} />{GROW_COPY.brand}</Link>
        <NavLinks request={request} pathname={pathname} className="g-top-nav" />
        <div className="g-header-end">
          {source && <SourceBadge source={source} />}
          <GrowMenu request={request} />
        </div>
      </header>
      <main className="g-main">{children}</main>
      <NavLinks request={request} pathname={pathname} className="g-bottom-nav" />
    </div>
  )
}

/** Suspense fallback before search params resolve: brand only, no data claims. */
export function GrowShellFallback() {
  return (
    <div className="g-shell">
      <header className="g-header">
        <span className="g-wordmark">{GROW_COPY.brand}</span>
      </header>
      <main className="g-main">
        <div className="g-state" role="status">
          <div className="g-loading-line" />
          <p>{GROW_COPY.views.loading}</p>
        </div>
      </main>
    </div>
  )
}
