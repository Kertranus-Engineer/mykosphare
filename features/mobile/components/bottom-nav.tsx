"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, Ellipsis, House, Leaf, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface Tab {
  href: string
  label: string
  icon: LucideIcon
  /** Exact match only (Inicio would otherwise match every /home/* route). */
  exact?: boolean
}

const TABS: Tab[] = [
  { href: "/home-v1", label: "Inicio", icon: House, exact: true },
  { href: "/home-v1/environment", label: "Ambiente", icon: Leaf },
  { href: "/home-v1/history", label: "Historial", icon: Clock },
  { href: "/home-v1/more", label: "Más", icon: Ellipsis },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:inset-x-auto md:bottom-4 md:left-1/2 md:w-[26rem] md:-translate-x-1/2 md:rounded-2xl md:border md:pb-0 md:shadow-2xl md:shadow-black/40"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch px-1">
        {TABS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-medium transition-colors",
                  active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground active:text-foreground",
                )}
              >
                {active && (
                  <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_10px] shadow-emerald-400/60" />
                )}
                <Icon className={cn("size-[22px] transition-transform duration-200", active && "scale-110")} aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
