"use client"

import { Sprout, Thermometer, Droplets, Wind, Gauge, Ruler } from "lucide-react"

import { useEnvironment } from "@/mock/environment"
import { useTelemetry } from "@/mock/simulator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function EnvironmentPage() {
  const env = useEnvironment()
  const tel = useTelemetry()

  const zones = [
    {
      name: "Zone A — Main Chamber",
      temp: tel.temperature.value,
      hum: tel.humidity.value,
      co2: tel.co2.value,
      status: env.state,
    },
    {
      name: "Zone B — Incubation",
      temp: tel.temperature.value + 0.3,
      hum: tel.humidity.value - 1.2,
      co2: tel.co2.value + 5,
      status: "STABLE",
    },
    {
      name: "Zone C — Harvest",
      temp: tel.temperature.value - 0.5,
      hum: tel.humidity.value + 0.8,
      co2: tel.co2.value - 3,
      status: "STABLE",
    },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Environment</h1>
          <p className="text-sm text-muted-foreground">
            Multi-zone environmental monitoring and control
          </p>
        </div>
        <div
          className={cn(
            "rounded-md px-3 py-1 text-xs font-semibold tracking-wider ring-1 ring-inset transition-all duration-300",
            env.state === "WARNING"
              ? "bg-amber-500/10 text-amber-500 ring-amber-500/20"
              : env.state === "RECOVERY"
                ? "bg-teal-500/10 text-teal-500 ring-teal-500/20"
                : env.state === "OPTIMIZING"
                  ? "bg-blue-500/10 text-blue-500 ring-blue-500/20"
                  : "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20"
          )}
        >
          {env.label}
        </div>
      </div>

      <div className="flex gap-4">
        {zones.map((zone) => (
          <Card key={zone.name} className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{zone.name}</span>
                <div
                  className={cn(
                    "size-1.5 rounded-full",
                    zone.status === "WARNING"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  )}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 rounded-lg bg-muted/30 p-2.5">
                  <Thermometer className="size-3.5 text-muted-foreground" />
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {zone.temp.toFixed(1)}°
                  </span>
                  <span className="text-[10px] text-muted-foreground">Temp</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-muted/30 p-2.5">
                  <Droplets className="size-3.5 text-muted-foreground" />
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {zone.hum.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">Humidity</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-muted/30 p-2.5">
                  <Wind className="size-3.5 text-muted-foreground" />
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {zone.co2}
                  </span>
                  <span className="text-[10px] text-muted-foreground">CO₂ ppm</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Gauge className="size-4 text-muted-foreground" />
              Airflow Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { zone: "Zone A", cfm: 240, pct: 85 },
                { zone: "Zone B", cfm: 180, pct: 62 },
                { zone: "Zone C", cfm: 120, pct: 41 },
              ].map((item) => (
                <div key={item.zone} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-muted-foreground">
                    {item.zone}
                  </span>
                  <div className="flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500/60 transition-all"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                    {item.cfm} CFM
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Ruler className="size-4 text-muted-foreground" />
              VPD & Pressure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Vapor Pressure Deficit", value: "1.2 kPa", status: "Optimal" },
                { label: "Atmospheric Pressure", value: "101.3 kPa", status: "Stable" },
                { label: "Air Exchange Rate", value: "4.2 /hr", status: "Nominal" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {item.value}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-500">{item.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
