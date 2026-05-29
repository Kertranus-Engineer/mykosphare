"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { Play, Gauge, Share2, AlertTriangle, Terminal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/locales/locale-context"

let hydrated = false
const hydrationListeners = new Set<() => void>()

function useHydrated() {
  return useSyncExternalStore(
    (cb) => {
      hydrationListeners.add(cb)
      if (hydrated) queueMicrotask(cb)
      return () => { hydrationListeners.delete(cb) }
    },
    () => hydrated,
    () => false
  )
}

if (typeof window !== "undefined") {
  hydrated = true
  hydrationListeners.forEach((l) => l())
  hydrationListeners.clear()
}

const QUICK_ACTIONS = [
  { icon: Play, labelKey: "quickstart.run-simulation", href: "/dashboard/command-center", accent: "text-amber-500", glow: "hover:shadow-amber-500/15 hover:border-amber-500/30 hover:ring-amber-500/10" },
  { icon: Gauge, labelKey: "quickstart.open-unified", href: "/dashboard/unified", accent: "text-blue-500", glow: "hover:shadow-blue-500/15 hover:border-blue-500/30 hover:ring-blue-500/10" },
  { icon: Share2, labelKey: "quickstart.view-topology", href: "/dashboard/topology", accent: "text-violet-500", glow: "hover:shadow-violet-500/15 hover:border-violet-500/30 hover:ring-violet-500/10" },
  { icon: AlertTriangle, labelKey: "quickstart.inspect-incidents", href: "/dashboard/alerts", accent: "text-red-500", glow: "hover:shadow-red-500/15 hover:border-red-500/30 hover:ring-red-500/10" },
  { icon: Terminal, labelKey: "quickstart.open-command", href: "/dashboard/command-center", accent: "text-emerald-500", glow: "hover:shadow-emerald-500/15 hover:border-emerald-500/30 hover:ring-emerald-500/10" },
]

export function QuickStart() {
  const { t } = useLocale()
  const mounted = useHydrated()

  return (
    <Card size="sm" className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10 relative overflow-hidden">
      {/* Ambient operational grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_1px] shadow-emerald-500/30" />
          {mounted ? t("quickstart.title") : "Quick Start"}
        </CardTitle>
        <p className="text-xs text-muted-foreground/70">
          {mounted ? t("quickstart.description") : "Operational shortcuts"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.labelKey}
              href={action.href}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-3 text-center",
                "transition-all duration-180 ease-out",
                "hover:-translate-y-[2px] hover:bg-muted/40 hover:border-border/60",
                action.glow,
                "active:scale-[0.985]"
              )}
            >
              <action.icon className={cn("size-5 transition-transform duration-180 group-hover:scale-110", action.accent)} />
              <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                {mounted ? t(action.labelKey) : action.labelKey.split(".").pop()?.replace(/-/g, " ") ?? ""}
              </span>
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 mt-1 text-[8px] text-muted-foreground/20 tracking-wider">
          <span className="flex items-center gap-1">
            <span className="size-1 rounded-full bg-emerald-500/40" />
            SYSTEM READY
          </span>
          <span>·</span>
          <span>OPERATIONAL</span>
        </div>
      </CardContent>
    </Card>
  )
}
