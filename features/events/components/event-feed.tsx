"use client"

import { memo } from "react"
import {
  Info,
  AlertTriangle,
  ShieldAlert,
  Thermometer,
  Droplets,
  Wind,
  Camera,
  Gauge,
  Cpu,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { SEVERITY_COLORS, SEVERITY_DOT, type EnvironmentalEvent, type EventCategory } from "@/lib/events/event-engine"

const CATEGORY_ICONS: Record<EventCategory, React.ComponentType<{ className?: string }>> = {
  temperature: Thermometer,
  humidity: Droplets,
  co2: Wind,
  capture: Camera,
  correlation: Gauge,
  system: Cpu,
}

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: ShieldAlert,
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
  } catch {
    return iso
  }
}

const EventRow = memo(function EventRow({ event }: { event: EnvironmentalEvent }) {
  const severityColor = SEVERITY_COLORS[event.severity]
  const severityDot = SEVERITY_DOT[event.severity]
  const SeverityIcon = SEVERITY_ICONS[event.severity]
  const CategoryIcon = CATEGORY_ICONS[event.category]

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/10 border-b border-foreground/5 last:border-b-0">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20">
        <CategoryIcon className="size-3 text-muted-foreground/50" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full shrink-0", severityDot)} />
          <span className={cn("text-[11px] font-semibold truncate", severityColor)}>
            {event.title}
          </span>
        </div>
        <p className="text-[10px] text-foreground/55 leading-relaxed line-clamp-2">
          {event.description}
        </p>
        <div className="flex items-center gap-2 text-[8px] text-muted-foreground/40 mt-0.5">
          <Clock className="size-2.5" />
          <span className="tabular-nums">{formatTimestamp(event.timestamp)}</span>
          <span className="text-muted-foreground/20">·</span>
          <SeverityIcon className="size-2.5" />
          <span className="uppercase tracking-wider">{event.severity}</span>
          {event.value != null && (
            <>
              <span className="text-muted-foreground/20">·</span>
              <span>{event.value}{event.threshold != null ? ` / ${event.threshold}` : ""}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

interface EventFeedProps {
  events: EnvironmentalEvent[]
  limit?: number
  emptyMessage?: string
}

export const EventFeed = memo(function EventFeed({
  events,
  limit = 50,
  emptyMessage = "No events recorded",
}: EventFeedProps) {
  const display = events.slice(0, limit)

  if (display.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-8">
          <Info className="size-6 text-muted-foreground/15" />
          <p className="text-xs text-muted-foreground/40">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Info className="size-4 text-muted-foreground" />
          Environmental Events
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {events.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-foreground/5 max-h-[480px] overflow-y-auto">
          {display.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
})
