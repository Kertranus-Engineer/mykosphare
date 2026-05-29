"use client"

import { AlertTriangle } from "lucide-react"

import { useRealEnvironment } from "@/lib/useEnvironment"
import type { EnvState } from "@/lib/useEnvironment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function alertIconColor(state: EnvState): string {
  if (state === "CRITICAL") return "text-red-500 drop-[0_0_3px_rgba(239,68,68,0.3)]"
  return "text-amber-500 drop-[0_0_3px_rgba(251,191,36,0.3)]"
}

function alertBadgeStyle(state: EnvState): string {
  if (state === "CRITICAL") return "bg-red-500/10 text-red-500"
  return "bg-amber-500/10 text-amber-500"
}

export function AlertPanel() {
  const env = useRealEnvironment()

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className={cn("size-4", alertIconColor(env.state))} />
          Alerts
          {env.alerts.length > 0 && (
            <span className={cn("ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium", alertBadgeStyle(env.state))}>
              {env.alerts.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {env.alerts.length > 0 ? (
          env.alerts.map((alert) => (
            <div
              key={alert.label}
              className={cn(
                "flex items-start gap-3 rounded-lg p-3 transition-all duration-150",
                alert.bg,
                alert.glow
              )}
            >
              <alert.icon className={cn("mt-0.5 size-4 shrink-0", alert.color)} />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {alert.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {alert.description}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">No active alerts</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
