"use client"

import { AlertTriangle, Bell, CheckCircle2, Info, ShieldAlert, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { severityTone } from "../tone"
import type { ActivityItem, ActivitySeverity } from "../use-mobile-activity"
import { RelativeTime } from "./primitives"

const SEVERITY_ICON: Record<ActivitySeverity, LucideIcon> = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
}

const KIND_LABEL: Record<ActivityItem["kind"], string> = {
  alert: "Alerta",
  event: "Evento",
  change: "Cambio",
}

export function ActivityRow({ item }: { item: ActivityItem }) {
  const tone = severityTone(item.severity)
  const Icon = SEVERITY_ICON[item.severity]
  return (
    <li className="flex items-start gap-3 py-3">
      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border", tone.bg, tone.border)}>
        <Icon className={cn("size-4", tone.text)} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground break-words">{item.title}</p>
        {item.detail && <p className="mt-0.5 text-xs leading-snug text-muted-foreground break-words">{item.detail}</p>}
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
          <span className="uppercase tracking-wider">{KIND_LABEL[item.kind]}</span>
          <span aria-hidden>·</span>
          {item.timestamp === null ? (
            <span className={cn("font-medium", tone.text)}>Activa ahora</span>
          ) : (
            <RelativeTime at={item.timestamp} />
          )}
        </p>
      </div>
    </li>
  )
}

export function ActivityList({
  items,
  limit,
  emptyTitle = "Sin actividad reciente",
  emptyHint = "Las alertas y los cambios ambientales aparecerán aquí a medida que ocurran.",
}: {
  items: ActivityItem[]
  limit?: number
  emptyTitle?: string
  emptyHint?: string
}) {
  const shown = limit ? items.slice(0, limit) : items
  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted/50">
          <Bell className="size-5 text-muted-foreground/60" aria-hidden />
        </span>
        <p className="text-sm font-medium text-foreground/80">{emptyTitle}</p>
        <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">{emptyHint}</p>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-border/60">
      {shown.map((item) => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </ul>
  )
}
