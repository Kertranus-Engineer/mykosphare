"use client"

import Link from "next/link"
import { LayoutDashboard, Smartphone } from "lucide-react"

import { cn } from "@/lib/utils"

type Target = "home" | "advanced"

const META: Record<Target, { href: string; label: string; aria: string; icon: typeof Smartphone }> = {
  home: { href: "/home", label: "Home", aria: "Cambiar a la vista HOME", icon: Smartphone },
  advanced: { href: "/dashboard", label: "Avanzada", aria: "Cambiar a la vista avanzada", icon: LayoutDashboard },
}

/**
 * Compact switch between the two mobile experiences. `target` is the view the
 * button takes you TO (the other one is where you already are).
 */
export function ViewSwitchButton({ target, className }: { target: Target; className?: string }) {
  const { href, label, aria, icon: Icon } = META[target]
  return (
    <Link
      href={href}
      aria-label={aria}
      className={cn(
        "flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-cyan-700 transition-colors active:bg-cyan-500/10 dark:text-cyan-400",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
      <span className="hidden min-[430px]:inline">{label}</span>
    </Link>
  )
}

/** Two-option segmented control (used inside menus). */
export function ViewSwitchSegmented({ current }: { current: Target }) {
  return (
    <div role="group" aria-label="Vista" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1">
      {(["home", "advanced"] as Target[]).map((t) => {
        const { href, icon: Icon } = META[t]
        const active = t === current
        return (
          <Link
            key={t}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
              active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground active:bg-muted/60",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t === "home" ? "Vista HOME" : "Vista avanzada"}
          </Link>
        )
      })}
    </div>
  )
}
