"use client"

import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  Camera,
  Cog,
  LayoutDashboard,
  ScrollText,
  Sprout,
} from "lucide-react"
import { NavItem } from "./nav-item"
import { useUptime } from "@/mock/simulator"
import { DEPLOYMENT_ID, REGION, SOFTWARE_VERSION, getUptime } from "@/mock/device-registry"

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Sprout, label: "Environment", href: "/dashboard/environment" },
  { icon: Activity, label: "Analytics", href: "/dashboard/analytics" },
  { icon: Camera, label: "Camera", href: "/dashboard/camera" },
  { icon: AlertTriangle, label: "Alerts", href: "/dashboard/alerts" },
  { icon: ScrollText, label: "System Logs", href: "/dashboard/system-logs" },
  { icon: Cog, label: "Settings", href: "/dashboard/settings" },
]

export function AppSidebar() {
  const uptime = useUptime()
  const uptimeStr = uptime > 0 ? getUptime() : "0m"

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
      <Link href="/dashboard" className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-sidebar-primary">
          <Sprout className="size-4 text-sidebar-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-wide text-sidebar-foreground">
          MYKOSPHARE
        </span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            href={item.href}
          />
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2">
          <p className="text-[11px] font-medium text-sidebar-foreground/50">
            {DEPLOYMENT_ID}
          </p>
          <p className="text-[11px] text-sidebar-foreground/40">
            {REGION} · {SOFTWARE_VERSION}
          </p>
          <p className="mt-1 text-[10px] tabular-nums text-sidebar-foreground/30">
            Session: {uptimeStr}
          </p>
        </div>
      </div>
    </aside>
  )
}
