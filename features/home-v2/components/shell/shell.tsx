"use client"

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion"
import type { ReactNode } from "react"

import { ErrorBoundary } from "@/components/ui/error-boundary"
import { FeedbackProvider } from "../feedback"
import { HomeV2Provider, useHomeV2 } from "../../data/home-v2-provider"
import { GlyphField } from "../ui/glyph-field"
import { BottomNav } from "./bottom-nav"
import { Header } from "./header"

function ScreenError() {
  return (
    <div role="alert" className="hv2-empty">
      <p className="hv2-empty-title">No se pudo mostrar esta pantalla</p>
      <p className="hv2-empty-body">Recarga la página para reintentar.</p>
      <button type="button" className="hv2-button hv2-button--secondary hv2-press" onClick={() => window.location.reload()}>
        Recargar
      </button>
    </div>
  )
}

/** Character-art background in the person's theme. */
function ThemedGlyphField() {
  const { theme } = useHomeV2()
  return <GlyphField theme={theme} />
}

/**
 * HOME V2 shell. The provider picks the data source once (the demo engine, or the EXISTING
 * mobile telemetry / captures / grow view) and never duplicates their logic. `LazyMotion` keeps
 * Motion's footprint to the DOM animation features; `reducedMotion="user"`
 * honours the OS preference.
 */
export function HomeV2Shell({ children }: { children: ReactNode }) {
  // Motion and feedback sit ABOVE the data provider: switching the data source (demo on/off)
  // remounts the screens, and a toast announcing the switch must survive it.
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <FeedbackProvider>
          <HomeV2Provider>
            <div className="hv2-root" lang="es">
              <a href="#contenido" className="hv2-skip">Saltar al contenido</a>
              <div aria-hidden className="hv2-ambient" />
              <ThemedGlyphField />
              <Header />
              <main id="contenido" className="hv2-main">
                <ErrorBoundary fallback={<ScreenError />}>{children}</ErrorBoundary>
              </main>
              <BottomNav />
            </div>
          </HomeV2Provider>
        </FeedbackProvider>
      </MotionConfig>
    </LazyMotion>
  )
}

/** Static first paint while the query-driven providers resolve. */
export function HomeV2Fallback() {
  return (
    <div className="hv2-root" lang="es" aria-busy="true">
      <div aria-hidden className="hv2-ambient" />
      <header className="hv2-header"><div className="hv2-header-inner" /></header>
      <main className="hv2-main"><div className="hv2-skeleton" style={{ height: 300, borderRadius: 28 }} /></main>
    </div>
  )
}
