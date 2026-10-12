"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, Sprout } from "lucide-react"

import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ThemePicker } from "@/features/mobile/components/settings-sheet"
import { ViewSwitchSegmented } from "@/features/mobile/components/view-switch"
import { DEPLOYMENT_ID, REGION, SOFTWARE_VERSION, OPERATIONAL_SYSTEM } from "@/mock/device-registry"
import { navGroups } from "./app-sidebar"

/**
 * Mobile replacement for the desktop sidebar: same sections (shared `navGroups`),
 * rendered as a left drawer with touch-sized rows.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de secciones"
        aria-expanded={open}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-foreground/80 transition-colors active:bg-muted/60"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[85vw] max-w-xs gap-0 p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] data-[side=left]:w-[85vw] data-[side=left]:max-w-xs"
        >
          <SheetHeader className="flex-row items-center gap-2.5 border-b border-border pr-14">
            <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Sprout className="size-4 text-sidebar-primary-foreground" aria-hidden />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-sm tracking-[0.14em]">MYKOSPHARE</SheetTitle>
              <SheetDescription className="text-xs">Vista avanzada</SheetDescription>
            </div>
          </SheetHeader>

          <nav aria-label="Secciones" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            <div className="mb-4">
              <ViewSwitchSegmented current="advanced" />
            </div>

            {navGroups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
                <ul>
                  {group.items.map(({ icon: Icon, label, href }) => {
                    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"))
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors",
                            active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 active:bg-sidebar-accent/60",
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="min-w-0 truncate">{label}</span>
                          {active && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-emerald-500" />}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}

            <div className="mt-4 border-t border-border pt-4">
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tema</p>
              <ThemePicker />
            </div>

            <div className="mt-4 rounded-lg bg-sidebar-accent/50 px-3 py-2 text-[11px] text-sidebar-foreground/50">
              <p className="font-semibold uppercase tracking-wider">{OPERATIONAL_SYSTEM}</p>
              <p>{DEPLOYMENT_ID} · {REGION} · {SOFTWARE_VERSION}</p>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
