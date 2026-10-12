"use client"

import Link from "next/link"
import { Sprout } from "lucide-react"

import { cn } from "@/lib/utils"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"
import { ViewSwitchButton } from "@/features/mobile/components/view-switch"
import { MobileNav } from "./mobile-nav"

/** Compact header for the advanced view on phones (the desktop header is hidden below md). */
export function MobileHeader() {
  const rt = useRealTimeTelemetry()

  const chip =
    !rt.online ? { label: "Offline", cls: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400", dot: "bg-red-500" }
    : rt.source === "live" ? { label: "Live", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500 animate-pulse" }
    : rt.source === "simulated" ? { label: "Sim", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" }
    : { label: "—", cls: "border-border bg-muted/40 text-muted-foreground", dot: "bg-muted-foreground/50" }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
      <div className="flex h-14 items-center gap-1 pl-1 pr-2">
        <MobileNav />
        <Link href="/dashboard" className="flex min-h-11 min-w-0 items-center gap-2 pr-1" aria-label="MYKOSPHARE — Inicio avanzado">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Sprout className="size-4 text-sidebar-primary-foreground" aria-hidden />
          </span>
          <span className="hidden truncate text-[13px] font-semibold tracking-[0.14em] text-foreground min-[360px]:inline">MYKOSPHARE</span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span
            role="status"
            aria-label={`Fuente de datos: ${chip.label}`}
            title={rt.source === "simulated" ? "Datos simulados" : rt.source === "live" ? "Datos reales (ESP32)" : undefined}
            className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-[11px] font-semibold uppercase tracking-wider", chip.cls)}
          >
            <span className={cn("size-1.5 rounded-full", chip.dot)} />
            {chip.label}
          </span>
          <ViewSwitchButton target="home" />
        </div>
      </div>
    </header>
  )
}
