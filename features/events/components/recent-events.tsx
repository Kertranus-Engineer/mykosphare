"use client"

import { memo } from "react"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { SEVERITY_COLORS, SEVERITY_DOT, type EnvironmentalEvent } from "@/lib/events/event-engine"

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
  } catch {
    return iso
  }
}

interface RecentEventsProps {
  events: EnvironmentalEvent[]
  limit?: number
}

export const RecentEvents = memo(function RecentEvents({
  events,
  limit = 10,
}: RecentEventsProps) {
  const recent = events.slice(0, limit)

  if (recent.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="size-4 text-muted-foreground" />
            Recent Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <AlertTriangle className="size-5 text-muted-foreground/15" />
            <p className="text-xs text-muted-foreground/40">No recent events</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="size-4 text-muted-foreground" />
          Recent Events
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50">
            last {Math.min(limit, events.length)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {recent.map((event) => {
          const dot = SEVERITY_DOT[event.severity]
          const color = SEVERITY_COLORS[event.severity]

          return (
            <div
              key={event.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors hover:bg-muted/10",
                event.severity === "critical" && "bg-red-500/5",
                event.severity === "warning" && "bg-amber-500/5",
              )}
            >
              <span className={cn("size-1.5 rounded-full shrink-0", dot)} />
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className={cn("text-[10px] font-semibold truncate", color)}>
                  {event.title}
                </span>
                <span className="text-[9px] tabular-nums text-muted-foreground/50">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
              <span className="text-[8px] uppercase tracking-wider text-muted-foreground/40">
                {event.category}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
})
