"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import type { ReactNode } from "react"

import { ErrorBoundary } from "@/components/ui/error-boundary"
import { MobileDataProvider } from "../mobile-data-context"
import { BottomNav } from "./bottom-nav"
import { MobileHeader } from "./mobile-header"

function ScreenErrorFallback() {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-red-500/10">
        <AlertTriangle className="size-6 text-red-500" aria-hidden />
      </span>
      <div>
        <h2 className="text-base font-semibold text-foreground">No se pudo mostrar esta pantalla</h2>
        <p className="mt-1 text-sm text-muted-foreground">Vuelve a cargar para reintentar.</p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-muted/40 px-5 text-sm font-medium text-foreground active:bg-muted"
      >
        <RefreshCw className="size-4" aria-hidden />
        Recargar
      </button>
    </div>
  )
}

/**
 * MYKOSPHARE HOME shell: compact header, content column, fixed bottom nav.
 * Lives outside the desktop AppShell on purpose (no sidebar, no boot screen,
 * no walkthrough overlays).
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <MobileDataProvider>
      <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute -top-32 -left-24 size-80 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-1/3 -right-32 size-80 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <MobileHeader />

        <main
          id="contenido"
          className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:pt-6 md:pb-28"
        >
          <ErrorBoundary fallback={<ScreenErrorFallback />}>{children}</ErrorBoundary>
        </main>

        <BottomNav />
      </div>
    </MobileDataProvider>
  )
}
