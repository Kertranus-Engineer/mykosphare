"use client"

import { ScrollText } from "lucide-react"

import { useLogs } from "@/mock/simulator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function LogDot({ type }: { type: "info" | "success" }) {
  return (
    <div
      className={cn(
        "mt-1.5 size-1.5 shrink-0 rounded-full",
        type === "success"
          ? "bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-500/30"
          : "bg-muted-foreground/40"
      )}
    />
  )
}

export function SystemLogs() {
  const logs = useLogs()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-4 text-muted-foreground" />
          System Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-3 rounded px-1 py-1.5">
              <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                {log.time}
              </span>
              <LogDot type={log.type} />
              <span className="text-xs text-foreground/80">{log.message}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
