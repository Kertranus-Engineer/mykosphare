"use client"

import Link from "next/link"
import { Check, Monitor } from "lucide-react"

import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useThemeProfile } from "@/lib/theme/theme-provider"
import { THEMES, type ThemeProfile } from "@/lib/theme/themes"

const THEME_ORDER: ThemeProfile[] = ["obsidian", "pure-black", "lab-light"]

export function ThemePicker() {
  const { profile, setProfile } = useThemeProfile()
  return (
    <div role="radiogroup" aria-label="Tema visual" className="flex flex-col gap-2">
      {THEME_ORDER.map((key) => {
        const t = THEMES[key]
        const active = profile === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setProfile(key)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-xl border px-3.5 text-left transition-colors",
              active ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-muted/30 active:bg-muted/60",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-5 shrink-0 rounded-full border-2",
                key === "obsidian" && "border-neutral-600 bg-neutral-900",
                key === "pure-black" && "border-neutral-700 bg-black",
                key === "lab-light" && "border-neutral-300 bg-white",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold tracking-wide text-foreground">{t.label}</span>
              <span className="block text-xs leading-snug text-muted-foreground">{t.description}</span>
            </span>
            {active && <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] gap-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pr-14">
          <SheetTitle>Configuración</SheetTitle>
          <SheetDescription>Apariencia de MYKOSPHARE HOME en este dispositivo.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tema</h3>
            <ThemePicker />
          </section>
          <Link
            href="/dashboard/settings"
            className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-muted/30 px-3.5 text-sm font-medium text-foreground active:bg-muted/60"
          >
            <Monitor className="size-4 text-cyan-600 dark:text-cyan-400" aria-hidden />
            Ajustes avanzados (vista avanzada)
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
