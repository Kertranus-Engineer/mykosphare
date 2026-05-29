"use client"

import { useState } from "react"
import { Palette, Check, Presentation } from "lucide-react"
import { cn } from "@/lib/utils"
import { useThemeProfile } from "@/lib/theme/theme-provider"
import { THEMES, type ThemeProfile } from "@/lib/theme/themes"

const THEME_ORDER: ThemeProfile[] = ["obsidian", "lab-light", "pure-black"]

export function ThemeSelector() {
  const { profile, setProfile, presentation, setPresentation } = useThemeProfile()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")

  const handleSelect = (p: ThemeProfile) => {
    setProfile(p)
    setLabel(THEMES[p].label)
    setTimeout(() => setLabel(""), 2000)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 hover:text-muted-foreground hover:border-border transition-all duration-300",
          open && "border-border text-foreground"
        )}
        title="Operational Profiles"
      >
        <Palette className="size-3" />
        <span className="hidden sm:inline">
          {label || THEMES[profile].label}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-52 rounded-lg border border-border bg-card shadow-lg shadow-foreground/5 overflow-hidden">
            <div className="border-b border-border/50 px-3 py-2">
              <span className="text-[9px] font-bold tracking-[0.2em] text-muted-foreground/40 uppercase">
                Operational Profiles
              </span>
            </div>

            {THEME_ORDER.map((key) => {
              const t = THEMES[key]
              const active = profile === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(key)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {/* Theme preview dot */}
                  <div
                    className={cn(
                      "size-4 rounded-full border-2 shrink-0",
                      key === "obsidian" && "bg-neutral-900 border-neutral-700",
                      key === "lab-light" && "bg-white border-neutral-300",
                      key === "pure-black" && "bg-black border-neutral-800"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold tracking-wide">
                      {t.label}
                    </div>
                    <div className="text-[9px] text-muted-foreground/50 truncate">
                      {t.description}
                    </div>
                  </div>
                  {active && <Check className="size-3.5 shrink-0" />}
                </button>
              )
            })}

            {/* Presentation mode toggle */}
            <div className="border-t border-border/50 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setPresentation(!presentation)}
                className={cn(
                  "flex w-full items-center gap-3 text-left transition-colors duration-200",
                  presentation
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "size-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                  presentation ? "bg-primary/20 border-primary" : "border-muted-foreground/30"
                )}>
                  {presentation && <Check className="size-2.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold tracking-wide flex items-center gap-1.5">
                    <Presentation className="size-3" />
                    Presentation Mode
                  </div>
                  <div className="text-[9px] text-muted-foreground/50">
                    Larger text · less visual noise
                  </div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
