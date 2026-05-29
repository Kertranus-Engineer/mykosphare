"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWalkthrough } from "@/lib/walkthrough/walkthrough-context"
import { useLocale } from "@/lib/locales/locale-context"

interface NavItemProps {
  icon: LucideIcon
  label: string
  href: string
  labelKey?: string
}

export function NavItem({ icon: Icon, label, href, labelKey }: NavItemProps) {
  const pathname = usePathname()
  const active =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"))
  const { isHighlighted } = useWalkthrough()
  const { t } = useLocale()
  const highlighted = isHighlighted(label)
  const displayLabel = labelKey ? t(labelKey) : label

  return (
    <Link
      href={href}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-150",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70",
        highlighted &&
          "bg-sidebar-accent/80 text-sidebar-accent-foreground ring-2 ring-emerald-500/40 shadow-[0_0_12px_2px] shadow-emerald-500/20"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{displayLabel}</span>
      {active && (
        <span className="ml-auto size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-500/50 animate-pulse" />
      )}
    </Link>
  )
}
