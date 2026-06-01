import { Camera, Activity, Database, Sprout, Bot, ScanEye, Wifi, Zap, ChartLine, Cpu } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function AutomationReadiness() {
  const rows = [
    { label: "Visual Analysis", status: "Ready", icon: Camera },
    { label: "Sensor Telemetry", status: "Ready", icon: Activity },
    { label: "Image Storage", status: "Ready", icon: Database },
    { label: "Growth Engine", status: "Ready", icon: Sprout },
    { label: "AI Hook Layer", status: "Ready", icon: Bot },
    { label: "Difference Engine", status: "Ready", icon: ScanEye },
    { label: "ESP32 Communication", status: "Planned", icon: Wifi },
    { label: "Autonomous Control", status: "Planned", icon: Zap },
    { label: "Growth Prediction", status: "Planned", icon: ChartLine },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cpu className="size-4 text-muted-foreground" />
          Automation Readiness
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((row) => {
            const Icon = row.icon
            const isReady = row.status === "Ready"
            return (
              <div key={row.label} className="flex items-center gap-3 rounded-lg bg-muted/20 px-3 py-2.5">
                <Icon className={cn("size-4 shrink-0", isReady ? "text-emerald-500/60" : "text-muted-foreground/30")} />
                <span className="text-xs text-foreground/70 flex-1">{row.label}</span>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: row.label.length }).map((_, i) => (
                      <span key={i} className={cn("size-0.5 rounded-full", isReady ? "bg-emerald-500/40" : "bg-muted-foreground/20")} />
                    ))}
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    isReady ? "bg-emerald-500/10 text-emerald-500" : "bg-muted/30 text-muted-foreground/50",
                  )}>
                    {row.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
