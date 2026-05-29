"use client"

import { useCallback, useEffect } from "react"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { BootScreen } from "@/features/init/components/boot-screen"
import { OperationalAmbiance } from "@/features/ambiance/components/operational-ambiance"
import { DemoMode } from "@/features/demo/components/demo-mode"
import { PresentationProvider, usePresentationMode } from "@/features/presentation/components/presentation-mode"
import { WalkthroughProvider, useWalkthrough } from "@/lib/walkthrough/walkthrough-context"
import { OperatorWalkthrough } from "@/features/onboarding/components/operator-walkthrough"
import { useRealEnvironment } from "@/lib/useEnvironment"

function WalkthroughAutoStart() {
  const { start } = useWalkthrough()

  const handleBootComplete = useCallback(() => {
    const t = setTimeout(() => start(), 400)
    return () => clearTimeout(t)
  }, [start])

  return <BootScreen onComplete={handleBootComplete} />
}

function PresentationOverlay() {
  const { enabled } = usePresentationMode()

  if (!enabled) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] transition-all duration-500" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-500 tracking-wider shadow-[0_0_20px_-4px] shadow-emerald-500/20 animate-pulse">
        PRESENTATION MODE
      </div>
    </div>
  )
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const env = useRealEnvironment()

  // Contextual mood: set operational state on <html> for CSS-reactive ambient effects
  useEffect(() => {
    document.documentElement.setAttribute("data-ops-state", env.state)
    return () => { document.documentElement.removeAttribute("data-ops-state") }
  }, [env.state])

  return (
    <div className="flex min-h-screen">
      <OperationalAmbiance />
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader />
        <main className="relative z-10 flex flex-1 flex-col overflow-x-hidden main-vignette">
          <div className="system-scanline" />
          <div className="ambient-texture" />
          {children}
        </main>
      </div>
      {process.env.NODE_ENV === "development" && <DemoMode />}
      <PresentationOverlay />
      <OperatorWalkthrough />
    </div>
  )
}

function ShellWithWalkthrough({ children }: { children: React.ReactNode }) {
  return (
    <WalkthroughProvider>
      <WalkthroughAutoStart />
      <ShellContent>
        {children}
      </ShellContent>
    </WalkthroughProvider>
  )
}

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <PresentationProvider>
      <ShellWithWalkthrough>
        {children}
      </ShellWithWalkthrough>
    </PresentationProvider>
  )
}
