"use client"

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion"
import type { ReactNode } from "react"

import { ErrorBoundary } from "@/components/ui/error-boundary"
import { MobileDataProvider } from "@/features/mobile/mobile-data-context"
import { FeedbackProvider } from "../feedback"
import { HomeV2Provider } from "../../data/home-v2-provider"
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

/**
 * HOME V2 shell. It composes the EXISTING data providers once (mobile telemetry,
 * captures, grow view) and never duplicates their logic. `LazyMotion` keeps
 * Motion's footprint to the DOM animation features; `reducedMotion="user"`
 * honours the OS preference.
 */
export function HomeV2Shell({ children }: { children: ReactNode }) {
  return (
    <MobileDataProvider>
      <HomeV2Provider>
        <LazyMotion features={domAnimation} strict>
          <MotionConfig reducedMotion="user">
            <FeedbackProvider>
              <div className="hv2-root" lang="es">
                <a href="#contenido" className="hv2-skip">Saltar al contenido</a>
                <div aria-hidden className="hv2-ambient" />
                <Header />
                <main id="contenido" className="hv2-main">
                  <ErrorBoundary fallback={<ScreenError />}>{children}</ErrorBoundary>
                </main>
                <BottomNav />
              </div>
            </FeedbackProvider>
          </MotionConfig>
        </LazyMotion>
      </HomeV2Provider>
    </MobileDataProvider>
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
