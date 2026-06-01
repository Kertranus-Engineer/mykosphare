"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  Brain,
  ChevronDown,
  Clock,
  Cog,
  LayoutDashboard,
  ScrollText,
  Info,
  Share2,
  Sliders,
  Sprout,
  Terminal,
  PanelLeftClose,
  PanelLeft,
  GitBranch,
  Briefcase,
  PiggyBank,
  Map,
  Layers,
  Microscope,
  Eye,
} from "lucide-react"
import { NavItem } from "./nav-item"
import { useUptime } from "@/mock/simulator"
import { DEPLOYMENT_ID, REGION, SOFTWARE_VERSION, OPERATIONAL_SYSTEM } from "@/mock/device-registry"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItemDef { icon: LucideIcon; label: string; href: string; labelKey?: string }
interface NavGroup { label: string; items: NavItemDef[] }

const navGroups: NavGroup[] = [
  {
    label: "CORE",
    items: [
      { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
      { icon: Sprout, label: "Environment", href: "/dashboard/environment" },
      { icon: Activity, label: "Analytics", href: "/dashboard/analytics" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { icon: Brain, label: "Intelligence", href: "/dashboard/intelligence" },
      { icon: Eye, label: "Visual Intelligence", href: "/dashboard/visual-intelligence" },
      { icon: Share2, label: "Topology", href: "/dashboard/topology" },
      { icon: Clock, label: "Timeline", href: "/dashboard/timeline" },
      { icon: Terminal, label: "Command Center", href: "/dashboard/command-center" },
    ],
  },
  {
    label: "PROJECT",
    items: [
      { icon: GitBranch, label: "Architecture", href: "/dashboard/architecture" },
      { icon: Briefcase, label: "Applications", href: "/dashboard/applications" },
      { icon: PiggyBank, label: "Cost Advantage", href: "/dashboard/cost-advantage" },
      { icon: Map, label: "Roadmap", href: "/dashboard/roadmap" },
      { icon: Layers, label: "Technology Stack", href: "/dashboard/technology-stack" },
      { icon: Microscope, label: "Prototype", href: "/dashboard/prototype" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { icon: Sliders, label: "Configuration", href: "/dashboard/configuration" },
      { icon: AlertTriangle, label: "Alerts", href: "/dashboard/alerts" },
      { icon: ScrollText, label: "System Logs", href: "/dashboard/system-logs" },
      { icon: Cog, label: "Settings", href: "/dashboard/settings" },
      { icon: Info, label: "About", href: "/dashboard/about" },
    ],
  },
]

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function AppSidebar() {
  const uptime = useUptime()
  const uptimeStr = uptime > 0 ? fmtDuration(uptime) : "0m"
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [mini, setMini] = useState(false)

  function toggleGroup(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const toggleSidebar = useCallback(() => {
    setMini((prev) => {
      const next = !prev
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"))
        })
      })
      return next
    })
  }, [])

  return (
    <aside className={cn(
      "sticky top-0 h-screen z-30 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-220 sidebar-shell shrink-0",
      mini ? "w-[4.5rem]" : "w-38"
    )}>
      {/* ── Logo ────────────────────────────── */}
      <Link href="/dashboard" className={cn(
        "flex h-14 items-center border-b border-sidebar-border transition-all duration-220 shrink-0",
        mini ? "justify-center px-2" : "gap-2 px-2"
      )}>
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
          <Sprout className="size-4 text-sidebar-primary-foreground" />
        </div>
        {!mini && (
          <span className="text-[13px] font-semibold tracking-wide text-sidebar-foreground">
            MYKOSPHARE
          </span>
        )}
      </Link>

      {/* ── Navigation ──────────────────────── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-1">
        {navGroups.map((group) => (
          <div key={group.label} className={cn("mb-1", mini && "mb-0")}>
            {!mini && (
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-1 px-1.5 py-1 text-[9px] font-semibold tracking-[0.15em] text-sidebar-foreground/25 uppercase hover:text-sidebar-foreground/50 transition-colors"
              >
                <ChevronDown className={cn("size-2.5 transition-transform duration-200", collapsed[group.label] && "-rotate-90")} />
                {group.label}
              </button>
            )}
            {(!collapsed[group.label] || mini) && (
              <div className={cn("space-y-0.5", mini && "flex flex-col items-center gap-0.5 mt-1")}>
                {group.items.map((item) =>
                  mini ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex size-10 items-center justify-center rounded-lg text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
                      title={item.label}
                    >
                      <item.icon className="size-[18px]" />
                    </Link>
                  ) : (
                    <NavItem key={item.label} icon={item.icon} label={item.label} href={item.href} labelKey={item.labelKey} />
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* ── Footer ──────────────────────────── */}
      <div className={cn("border-t border-sidebar-border p-1.5 shrink-0", mini && "p-0")}>
        {!mini && (
          <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2">
            <p className="text-[10px] font-semibold tracking-wider text-sidebar-foreground/30 uppercase">{OPERATIONAL_SYSTEM}</p>
            <p className="mt-1 text-[11px] font-medium text-sidebar-foreground/50">{DEPLOYMENT_ID}</p>
            <p className="text-[11px] text-sidebar-foreground/40">{REGION} · {SOFTWARE_VERSION}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[10px] tabular-nums text-sidebar-foreground/30">
              <span className="inline-block size-1 rounded-full bg-emerald-500/60" />
              Session: {uptimeStr}
            </p>
          </div>
        )}
      </div>

      {/* ── Toggle — visible siempre, flotando en el borde ── */}
      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(
          "absolute z-50 flex items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/30 hover:text-sidebar-foreground hover:border-sidebar-foreground/20 transition-all duration-300",
          "shadow-[0_0_6px_-2px] shadow-sidebar-foreground/5 hover:shadow-[0_0_12px_-2px] hover:shadow-sidebar-foreground/10",
          mini
            ? "right-0 top-6 -translate-y-1/2 translate-x-1/2 size-7"   // peeks out from collapsed rail
            : "right-0 top-6 -translate-y-1/2 translate-x-1/2 size-6"   // peeks out from expanded rail
        )}
        title={mini ? "Expand sidebar" : "Collapse sidebar"}
      >
        {mini ? <PanelLeft className="size-3.5" /> : <PanelLeftClose className="size-3" />}
      </button>
    </aside>
  )
}
