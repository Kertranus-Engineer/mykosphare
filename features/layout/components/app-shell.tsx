"use client"

import { useState, useCallback } from "react"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { BootScreen } from "@/features/init/components/boot-screen"
import { OperationalAmbiance } from "@/features/ambiance/components/operational-ambiance"
import { DemoMode } from "@/features/demo/components/demo-mode"
import { PresentationProvider, usePresentationMode } from "@/features/presentation/components/presentation-mode"

function ShellContent({ children }: { children: React.ReactNode }) {
  const { enabled: presentationMode } = usePresentationMode()

  return (
    <div className="flex min-h-screen">
      <OperationalAmbiance />
      <div className={presentationMode ? "hidden" : ""}>
        <AppSidebar />
      </div>
      <div className={`flex flex-1 flex-col ${presentationMode ? "pl-0" : "pl-60"} transition-all duration-500`}>
        <div className={presentationMode ? "opacity-0 h-0 overflow-hidden transition-all duration-500" : ""}>
          <AppHeader />
        </div>
        <main className={`relative z-10 flex flex-1 flex-col overflow-x-hidden transition-all duration-500 ${presentationMode ? "pt-0" : ""}`}>
          {children}
        </main>
      </div>
      <div className={presentationMode ? "hidden" : ""}>
        <DemoMode />
      </div>
    </div>
  )
}

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const handleBootComplete = useCallback(() => {
    // boot complete, state managed by BootScreen
  }, [])

  return (
    <PresentationProvider>
      <BootScreen onComplete={handleBootComplete} />
      <ShellContent>
        {children}
      </ShellContent>
    </PresentationProvider>
  )
}
