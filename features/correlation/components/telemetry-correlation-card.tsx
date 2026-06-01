"use client"

import { memo } from "react"
import {
  Thermometer,
  Droplets,
  Wind,
  Zap,
  Clock,
  Gauge,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CorrelatedCapture } from "@/lib/correlation/correlation-engine"

interface TelemetryCorrelationProps {
  correlated: CorrelatedCapture | null
  className?: string
}

function formatTime(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  } catch {
    return "—"
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return "—"
  }
}

export const TelemetryCorrelationCard = memo(function TelemetryCorrelationCard({
  correlated,
  className,
}: TelemetryCorrelationProps) {
  if (!correlated) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Gauge className="size-4 text-muted-foreground" />
            Telemetry Correlation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Gauge className="size-6 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/50">Select a capture to view correlation</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { telemetry, correlationScore, timeOffsetSeconds } = correlated
  const isMatched = telemetry !== null
  const qualityClass =
    correlationScore >= 90 ? "text-emerald-500" :
    correlationScore >= 60 ? "text-amber-500" : "text-red-500"
  const qualityBg =
    correlationScore >= 90 ? "bg-emerald-500/10 border-emerald-500/20" :
    correlationScore >= 60 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20"

  return (
    <Card className={cn("transition-all duration-200", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gauge className="size-4 text-muted-foreground" />
          Telemetry Correlation
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Correlation Status */}
        <div className={cn(
          "flex items-center gap-3 rounded-lg border px-3 py-2.5",
          isMatched ? qualityBg : "bg-muted/10 border-border/20",
        )}>
          {isMatched ? (
            <CheckCircle2 className={cn("size-4 shrink-0", qualityClass)} />
          ) : (
            <WifiOff className="size-4 shrink-0 text-muted-foreground/40" />
          )}
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className={cn("text-[11px] font-semibold", isMatched ? qualityClass : "text-muted-foreground/50")}>
              {isMatched ? "Matched" : "No correlated telemetry found"}
            </span>
            {isMatched && (
              <span className="text-[9px] text-muted-foreground/50">
                Offset: {timeOffsetSeconds}s · Quality: {correlationScore}%
              </span>
            )}
          </div>
        </div>

        {isMatched && telemetry && (
          <>
            {/* Telemetry Values */}
            <div className="rounded-lg border border-border/20 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-foreground/5">
                <div className="flex items-center gap-2">
                  <Thermometer className="size-3 text-amber-500/60" />
                  <span className="text-[10px] text-muted-foreground/50">Temperature</span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums text-foreground/80">
                  {telemetry.temperature != null ? `${telemetry.temperature.toFixed(1)}°C` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-foreground/5">
                <div className="flex items-center gap-2">
                  <Droplets className="size-3 text-cyan-500/60" />
                  <span className="text-[10px] text-muted-foreground/50">Humidity</span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums text-foreground/80">
                  {telemetry.humidity != null ? `${telemetry.humidity.toFixed(1)}%` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-foreground/5">
                <div className="flex items-center gap-2">
                  <Wind className="size-3 text-slate-500/60" />
                  <span className="text-[10px] text-muted-foreground/50">CO₂</span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums text-foreground/80">
                  {telemetry.co2 != null ? `${telemetry.co2} ppm` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-foreground/5">
                <div className="flex items-center gap-2">
                  <Zap className="size-3 text-yellow-500/60" />
                  <span className="text-[10px] text-muted-foreground/50">Energy</span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums text-foreground/80">
                  {telemetry.energy_usage != null ? `${telemetry.energy_usage.toFixed(2)} kWh` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-foreground/5">
                <div className="flex items-center gap-2">
                  <Clock className="size-3 text-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground/50">Timestamp</span>
                </div>
                <span className="text-[10px] font-mono tabular-nums text-foreground/70">
                  {formatDate(telemetry.created_at)} {formatTime(telemetry.created_at)}
                </span>
              </div>
              {telemetry.environmental_state && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Gauge className="size-3 text-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground/50">Env State</span>
                  </div>
                  <span className="text-[10px] font-medium text-foreground/70">
                    {telemetry.environmental_state}
                  </span>
                </div>
              )}
            </div>

            {/* Quality Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground/50">Correlation Quality</span>
                <span className={cn("text-[10px] font-bold tabular-nums", qualityClass)}>
                  {correlationScore}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    correlationScore >= 90 ? "bg-emerald-500" :
                    correlationScore >= 60 ? "bg-amber-500" : "bg-red-500",
                  )}
                  style={{ width: `${correlationScore}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] text-muted-foreground/30">
                <span>0s offset = 100%</span>
                <span>300s+ = 0%</span>
              </div>
            </div>
          </>
        )}

        {!isMatched && (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <AlertTriangle className="size-5 text-muted-foreground/20" />
            <p className="text-[10px] text-muted-foreground/40">
              No telemetry data found within {timeOffsetSeconds > 0 ? `${timeOffsetSeconds}s` : "range"} of this capture
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
