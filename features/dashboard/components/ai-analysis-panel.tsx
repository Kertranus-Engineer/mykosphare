"use client"

import { Brain } from "lucide-react"

import { useEnvironment } from "@/mock/environment"
import { useTelemetry } from "@/mock/simulator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function AiAnalysisPanel() {
  const tel = useTelemetry()
  const env = useEnvironment()
  const HealthIcon = env.icon

  const metricsRows = [
    {
      label: "System Health",
      value:
        env.state === "WARNING"
          ? "84.2%"
          : env.state === "RECOVERY"
            ? "92.7%"
            : env.state === "OPTIMIZING"
              ? "96.1%"
              : "97.4%",
      color:
        env.state === "WARNING"
          ? "text-amber-500"
          : "text-emerald-500",
    },
    {
      label: "Temperature",
      value: `${tel.temperature.value}°C`,
      color:
        tel.temperature.value > 25.3 || tel.temperature.value < 23.9
          ? "text-amber-500"
          : "text-emerald-500",
    },
    {
      label: "Humidity",
      value: `${tel.humidity.value}%`,
      color:
        tel.humidity.value > 63 || tel.humidity.value < 59
          ? "text-amber-500"
          : "text-emerald-500",
    },
    {
      label: "CO₂",
      value: `${tel.co2.value} ppm`,
      color: tel.co2.value > 420 ? "text-amber-500" : "text-emerald-500",
    },
  ]

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-4 text-muted-foreground" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5 ring-1 transition-all duration-300",
            env.ringColor
          )}
        >
          <HealthIcon
            className={cn("size-8 transition-all duration-300", env.iconColor)}
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {env.headTitle}
            </span>
            <span className="text-xs text-muted-foreground">
              {env.headSub}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          {metricsRows.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg px-1 py-1"
            >
              <span className="text-xs text-muted-foreground">
                {item.label}
              </span>
              <span className={cn("text-xs font-semibold tabular-nums", item.color)}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/20 p-3 transition-all duration-300">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {env.aiSummary}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
