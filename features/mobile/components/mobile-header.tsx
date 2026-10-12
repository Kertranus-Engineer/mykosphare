"use client"

import Link from "next/link"
import { Bell, Settings, Sprout } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { useMobileData } from "../mobile-data-context"
import { connectionTone } from "../tone"
import { NotificationsSheet } from "./notifications-sheet"
import { SettingsSheet } from "./settings-sheet"
import { ViewSwitchButton } from "./view-switch"

function ConnectionChip() {
  const { tel } = useMobileData()
  const { kind, label } = tel.connection
  const tone = connectionTone(kind)
  const pulsing = kind === "live" || kind === "connecting"

  return (
    <span
      role="status"
      aria-label={`Estado de conexión: ${label}`}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold", tone.bg, tone.border, tone.text)}
    >
      <span className={cn("size-2 rounded-full", tone.dot, pulsing && "animate-pulse motion-reduce:animate-none")} />
      {/* Dot-only on the narrowest phones so the header never overflows at 320px. */}
      <span className="hidden min-[390px]:inline">{label}</span>
    </span>
  )
}

const iconButton =
  "relative flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors active:bg-muted/60 active:text-foreground"

export function MobileHeader() {
  const { attentionCount } = useMobileData()
  const [notifOpen, setNotifOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 pl-4 pr-2 sm:px-6">
        <Link href="/home" className="flex min-h-11 min-w-0 items-center gap-2" aria-label="MYKOSPHARE — Inicio">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-[0_0_14px_-2px] shadow-emerald-400/50">
            <Sprout className="size-4 text-background" aria-hidden />
          </span>
          <span className="hidden truncate text-[13px] font-semibold tracking-[0.16em] text-foreground min-[360px]:inline">MYKOSPHARE</span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <ConnectionChip />
          <ViewSwitchButton target="advanced" />
          <button type="button" className={iconButton} onClick={() => setNotifOpen(true)} aria-label={attentionCount > 0 ? `Notificaciones, ${attentionCount} activas` : "Notificaciones"}>
            <Bell className="size-5" aria-hidden />
            {attentionCount > 0 && (
              <span className="absolute right-2 top-2 flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-4 text-background">
                {attentionCount}
              </span>
            )}
          </button>
          <button type="button" className={iconButton} onClick={() => setSettingsOpen(true)} aria-label="Configuración">
            <Settings className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  )
}
