"use client"

import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"

import { useEnvironment } from "@/mock/environment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const resolvedAlerts = [
  {
    label: "Humidity Spike",
    description: "Brief elevation to 67% — automatically corrected",
    time: "2h ago",
    severity: "info" as const,
  },
  {
    label: "Temp Deviation",
    description: "Zone B reached 26.2°C — HVAC compensated",
    time: "6h ago",
    severity: "info" as const,
  },
  {
    label: "CO₂ Fluctuation",
    description: "Reading spiked to 435 ppm — air exchange engaged",
    time: "12h ago",
    severity: "info" as const,
  },
]

export default function AlertsPage() {
  const env = useEnvironment()

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Active and historical environmental alerts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="size-4 text-amber-500" />
            Active Alerts
            {env.alerts.length > 0 && (
              <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                {env.alerts.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {env.alerts.length > 0 ? (
            <div className="space-y-2">
              {env.alerts.map((alert) => (
                <div
                  key={alert.label}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-3",
                    alert.bg,
                    alert.glow
                  )}
                >
                  <alert.icon
                    className={cn("mt-0.5 size-4 shrink-0", alert.color)}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {alert.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {alert.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 p-6">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">
                No active alerts
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            Recent History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {resolvedAlerts.map((alert) => (
              <div
                key={alert.label}
                className="flex items-start gap-3 rounded-lg bg-muted/20 p-3"
              >
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-500/60" />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {alert.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {alert.description}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/50">
                  {alert.time}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
