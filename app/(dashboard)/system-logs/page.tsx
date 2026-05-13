"use client"

import { ScrollText, Search } from "lucide-react"

import { useLogs } from "@/mock/simulator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const archivalLogs = [
  { time: "21:45", message: "LIGHT CYCLE TRANSITION", type: "info" as const },
  { time: "21:30", message: "AIR EXCHANGE CYCLE START", type: "info" as const },
  { time: "21:15", message: "HUMIDITY CHECK PASSED", type: "success" as const },
  { time: "21:00", message: "SENSOR CALIBRATION OK", type: "success" as const },
  { time: "20:45", message: "TEMPERATURE WITHIN RANGE", type: "success" as const },
  { time: "20:30", message: "FAE CYCLE COMPLETE", type: "info" as const },
  { time: "20:15", message: "MONITORING IDLE", type: "info" as const },
  { time: "20:00", message: "TELEMETRY SYNC OK", type: "success" as const },
  { time: "19:45", message: "AIRFLOW ADJUSTMENT COMPLETE", type: "info" as const },
  { time: "19:30", message: "CO₂ LEVELS NORMALIZED", type: "success" as const },
]

export default function SystemLogsPage() {
  const liveLogs = useLogs()

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            System Logs
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Operational event log and system telemetry history
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5">
          <Search className="size-3.5 text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground/60">
            Filter logs...
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScrollText className="size-4 text-muted-foreground" />
              Live Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {liveLogs.map((log, i) => (
                <div
                  key={`${log.time}-${i}`}
                  className="flex items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-muted/20"
                >
                  <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/60">
                    {log.time}
                  </span>
                  <div
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      log.type === "success"
                        ? "bg-emerald-500 shadow-[0_0_5px_1px] shadow-emerald-500/30"
                        : "bg-muted-foreground/40"
                    )}
                  />
                  <span className="text-xs text-foreground/80">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScrollText className="size-4 text-muted-foreground" />
              History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {archivalLogs.map((log, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-muted/20"
                >
                  <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/60">
                    {log.time}
                  </span>
                  <div
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      log.type === "success"
                        ? "bg-emerald-500/60"
                        : "bg-muted-foreground/30"
                    )}
                  />
                  <span className="text-xs text-muted-foreground/70">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
