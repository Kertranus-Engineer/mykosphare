"use client"

import { ArrowLeftRight, Fan, Radio } from "lucide-react"

import { useEnvironment } from "@/mock/environment"
import { useTelemetry } from "@/mock/simulator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const NODE_POSITIONS = [
  { top: "15%", left: "12%", label: "ZONE A", pulse: "animate-[node-pulse_3s_ease-in-out_infinite]" },
  { top: "18%", right: "14%", label: "ZONE B", pulse: "animate-[node-pulse_3.5s_ease-in-out_infinite_0.5s]" },
  { bottom: "22%", left: "18%", label: "SENSOR", pulse: "animate-[node-pulse_4s_ease-in-out_infinite_1s]" },
  { bottom: "25%", right: "16%", label: "MESH 1", pulse: "animate-[node-pulse_3.2s_ease-in-out_infinite_0.3s]" },
] as const

function chamberDotColor(state: string) {
  return state === "WARNING"
    ? "bg-amber-500 text-amber-500 shadow-amber-500/40"
    : state === "RECOVERY"
      ? "bg-teal-500 text-teal-500 shadow-teal-500/40"
      : "bg-emerald-500 text-emerald-500 shadow-emerald-500/40"
}

export function ChamberPanel() {
  const env = useEnvironment()
  const tel = useTelemetry()

  const dotColor = chamberDotColor(env.state)
  const sweepColor =
    env.state === "WARNING"
      ? "via-amber-500/5"
      : env.state === "RECOVERY"
        ? "via-teal-500/5"
        : "via-emerald-500/5"

  const airflowActive = env.state === "WARNING" || env.state === "OPTIMIZING"

  return (
    <Card className="flex-1 transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Environmental Chamber</span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-medium tracking-wider transition-all duration-300",
                env.color
              )}
            >
              {env.label}
            </span>
            <div
              className={cn(
                "size-1.5 rounded-full transition-all duration-300",
                dotColor
              )}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="relative flex aspect-[2/1] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-muted/90 to-muted">
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 to-transparent" />

          <div className="absolute inset-0 overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 -left-1/2 w-1/2 animate-[sweep_7s_ease-in-out_infinite] bg-gradient-to-r from-transparent to-transparent",
                sweepColor
              )}
            />
          </div>

          {NODE_POSITIONS.map((node) => (
            <div
              key={node.label}
              className="absolute z-10 flex items-center gap-1.5"
              style={{
                top: "top" in node ? node.top : undefined,
                bottom: "bottom" in node ? node.bottom : undefined,
                left: "left" in node ? node.left : undefined,
                right: "right" in node ? node.right : undefined,
              }}
            >
              <div
                className={cn(
                  "size-1.5 rounded-full transition-all duration-300",
                  dotColor,
                  node.pulse
                )}
              />
              <span className="text-[8px] font-medium tracking-wider text-muted-foreground/50">
                {node.label}
              </span>
            </div>
          ))}

          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-foreground/10 bg-background/60 px-4 py-1.5 backdrop-blur-sm">
              <div
                className={cn(
                  "size-2 rounded-full transition-all duration-300",
                  dotColor
                )}
              />
              <span className="text-[11px] font-medium text-foreground/80">
                {env.state === "WARNING" ? "MONITORING" : "OPERATIONAL"}
              </span>
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 z-10 h-7 bg-gradient-to-t from-background/70 to-transparent" />
          <div className="absolute bottom-1 inset-x-0 z-10 flex items-center justify-center gap-3">
            <span className="text-[9px] tabular-nums text-muted-foreground/50">
              {tel.temperature.value}°C
            </span>
            <span className="text-[9px] text-muted-foreground/20">|</span>
            <span className="text-[9px] tabular-nums text-muted-foreground/50">
              {tel.humidity.value}% RH
            </span>
            <span className="text-[9px] text-muted-foreground/20">|</span>
            <span className="text-[9px] tabular-nums text-muted-foreground/50">
              {tel.co2.value} ppm
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground/40">
          <Fan
            className={cn(
              "size-3 transition-all duration-300",
              airflowActive ? "text-emerald-500/60" : "text-muted-foreground/30"
            )}
          />
          <ArrowLeftRight
            className={cn(
              "size-3 transition-all duration-300",
              airflowActive
                ? "text-emerald-500/60 animate-[breathe_4s_ease-in-out_infinite]"
                : "text-muted-foreground/30"
            )}
          />
          <span className="tracking-[0.15em] text-muted-foreground/30">
            AIRFLOW
          </span>
          <div
            className={cn(
              "size-1 rounded-full transition-all duration-300",
              airflowActive
                ? "bg-emerald-500/60 animate-pulse"
                : "bg-muted-foreground/20"
            )}
          />
          <span className="text-muted-foreground/30">
            {airflowActive ? "FAE ACTIVE" : "FAE STANDBY"}
          </span>
          <Radio className="size-3 text-emerald-500/40" />
          <span className="text-muted-foreground/30">SENSOR MESH ONLINE</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {env.chamberIndicators.map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1 transition-all duration-150",
                item.color === "text-amber-500"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border/50 bg-muted/30 hover:border-emerald-500/30"
              )}
            >
              <div
                className={cn(
                  "size-1 rounded-full transition-all duration-300",
                  item.color === "text-amber-500"
                    ? "bg-amber-500 shadow-[0_0_4px_1px] shadow-amber-500/30"
                    : "bg-emerald-500 shadow-[0_0_4px_1px] shadow-emerald-500/30"
                )}
              />
              <span className="text-[11px] text-muted-foreground">
                {item.label}
              </span>
              <span className={cn("text-[11px] font-medium", item.color)}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
