"use client"

import { useEffect, useState } from "react"
import { ScrollText, Clock } from "lucide-react"

import { useLogs, useUptime } from "@/mock/simulator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getUptime } from "@/mock/device-registry"
import { useRealtimeLogs } from "@/lib/realtime/subscriptions"
import { RealtimeBadge } from "@/lib/realtime/status"

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

export default function SystemLogsPage() {
  const mounted = useMounted()
  const liveLogs = useLogs()
  const uptime = useUptime()
  const uptimeStr = uptime > 0 ? getUptime() : "0m"
  const { data: rtLogs, status, latency } = useRealtimeLogs(50)

  const recentLogs = liveLogs.slice(0, 10)
  const archiveLogs = liveLogs.slice(10)
  const hasPersisted = rtLogs.length > 0

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
        {mounted && (
          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5">
            <Clock className="size-3.5 text-muted-foreground/60" />
            <span className="text-xs tabular-nums text-muted-foreground/60">
              Session: {uptimeStr}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScrollText className="size-4 text-muted-foreground" />
              Recent Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mounted ? (
              <div className="space-y-0.5">
                {recentLogs.map((log, i) => (
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
            ) : (
              <div className="space-y-0.5">
                {recentLogs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded px-2 py-1.5"
                  >
                    <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/40">
                      —
                    </span>
                    <div className="size-1.5 shrink-0 rounded-full bg-muted-foreground/20" />
                    <span className="text-xs text-muted-foreground/50">
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScrollText className="size-4 text-muted-foreground" />
              Archive
              {hasPersisted && mounted && (
                <span className="text-[10px] font-normal text-muted-foreground/50">
                  {rtLogs.length} entries
                </span>
              )}
              <span className="ml-auto">
                <RealtimeBadge status={status} latency={latency} />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mounted && hasPersisted ? (
              <div className="space-y-0.5">
                {rtLogs.map((log, i) => (
                  <div
                    key={log.id ?? i}
                    className="flex items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-muted/20"
                  >
                    <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground/60">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--"}
                    </span>
                    <div className="size-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground/70">
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            ) : mounted && archiveLogs.length > 0 ? (
              <div className="space-y-0.5">
                {archiveLogs.map((log, i) => (
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
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground/50">
                No archived logs yet. More events will appear here as the session progresses.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
