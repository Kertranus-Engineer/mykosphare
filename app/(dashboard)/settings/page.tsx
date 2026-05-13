"use client"

import { useState } from "react"
import {
  Bell,
  Cog,
  Fan,
  Gauge,
  Monitor,
  Sliders,
  Thermometer,
  ToggleLeft,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function Toggle({
  label,
  description,
  defaultOn = false,
}: {
  label: string
  description: string
  defaultOn?: boolean
}) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2.5">
      <div className="flex flex-col">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <button
        type="button"
        onClick={() => setOn(!on)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
          on ? "bg-emerald-500" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "inline-block size-3.5 rounded-full bg-background shadow-sm transition-transform duration-200",
            on ? "translate-x-[18px]" : "translate-x-[3px]"
          )}
        />
      </button>
    </div>
  )
}

function SliderControl({
  label,
  value: initial,
  unit,
  min,
  max,
  step = 0.5,
}: {
  label: string
  value: number
  unit: string
  min: number
  max: number
  step?: number
}) {
  const [val, setVal] = useState(initial)
  return (
    <div className="rounded-lg bg-muted/20 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {val} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted-foreground/20 accent-emerald-500"
      />
    </div>
  )
}

const IDENTITY = [
  { label: "Chamber ID", value: "MYK-CH-001" },
  { label: "Deployment", value: "NA-East / DC-02" },
  { label: "Software", value: "MYKOSPHARE v0.1.0" },
  { label: "Uptime", value: "14d 7h 32m" },
  { label: "Cluster", value: "Environment Alpha" },
  { label: "Sensor Mesh", value: "24 nodes online" },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          System configuration and chamber profile management
        </p>
      </div>

      <div className="flex gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Cog className="size-4 text-muted-foreground" />
              Chamber Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {IDENTITY.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Thermometer className="size-4 text-muted-foreground" />
              Environmental Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SliderControl
              label="Temperature Range"
              value={24.5}
              unit="°C"
              min={20}
              max={28}
            />
            <SliderControl
              label="Humidity Target"
              value={61}
              unit="%"
              min={50}
              max={75}
            />
            <SliderControl
              label="CO₂ Limit"
              value={420}
              unit="ppm"
              min={350}
              max={500}
              step={5}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="size-4 text-muted-foreground" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Toggle
              label="Temperature Alerts"
              description="Notify when outside threshold"
              defaultOn
            />
            <Toggle
              label="Humidity Alerts"
              description="Notify on humidity deviation"
              defaultOn
            />
            <Toggle
              label="CO₂ Alerts"
              description="Notify on elevated CO₂ levels"
              defaultOn
            />
            <Toggle
              label="Maintenance Reminders"
              description="Filter replacement, calibration due"
              defaultOn
            />
            <Toggle
              label="System Updates"
              description="Software and firmware updates"
            />
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Fan className="size-4 text-muted-foreground" />
              Airflow & Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SliderControl
              label="Air Exchange Rate"
              value={4}
              unit="/hr"
              min={1}
              max={10}
              step={0.5}
            />
            <SliderControl
              label="Fan Speed"
              value={65}
              unit="%"
              min={10}
              max={100}
              step={5}
            />
            <div className="flex flex-col gap-2 pt-1">
              <Toggle
                label="Auto-balancing"
                description="Automatic airflow adjustment"
                defaultOn
              />
              <Toggle
                label="Night Mode"
                description="Reduced activity during dark cycle"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Monitor className="size-4 text-muted-foreground" />
              Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Toggle
              label="Telemetry Recording"
              description="Log sensor data to history"
              defaultOn
            />
            <Toggle
              label="Predictive Alerts"
              description="AI-based anomaly prediction"
              defaultOn
            />
            <Toggle
              label="Camera Recording"
              description="Timelapse image capture"
              defaultOn
            />
            <Toggle
              label="Remote Access"
              description="External API access"
            />
            <Toggle
              label="Diagnostic Mode"
              description="Extended sensor logging"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
