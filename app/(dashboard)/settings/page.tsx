"use client"

import {
  Bell,
  Cog,
  Fan,
  Monitor,
  Thermometer,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { usePersistedState } from "@/mock/persistence"
import { useUptime } from "@/mock/simulator"
import { DEPLOYMENT_ID, CLUSTER, REGION, SOFTWARE_VERSION, getUptime } from "@/mock/device-registry"

function Toggle({
  label,
  description,
  storageKey,
  defaultOn = false,
}: {
  label: string
  description: string
  storageKey: string
  defaultOn?: boolean
}) {
  const [on, setOn] = usePersistedState(storageKey, defaultOn)
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
  storageKey,
  defaultVal,
  unit,
  min,
  max,
  step = 0.5,
}: {
  label: string
  storageKey: string
  defaultVal: number
  unit: string
  min: number
  max: number
  step?: number
}) {
  const [val, setVal] = usePersistedState(storageKey, defaultVal)
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

export default function SettingsPage() {
  const uptime = useUptime()
  const uptimeStr = uptime > 0 ? getUptime() : "0m"

  const identityItems = [
    { label: "Chamber ID", value: DEPLOYMENT_ID },
    { label: "Deployment", value: REGION },
    { label: "Software", value: `MYKOSPHARE ${SOFTWARE_VERSION}` },
    { label: "Session Uptime", value: uptimeStr },
    { label: "Cluster", value: CLUSTER },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground/70">
          System configuration and chamber profile management
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Cog className="size-4 text-muted-foreground" />
              Chamber Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {identityItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground/70">
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

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Thermometer className="size-4 text-muted-foreground" />
              Environmental Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SliderControl
              label="Temperature Range"
              storageKey="threshold_temp"
              defaultVal={24.5}
              unit="°C"
              min={20}
              max={28}
            />
            <SliderControl
              label="Humidity Target"
              storageKey="threshold_hum"
              defaultVal={61}
              unit="%"
              min={50}
              max={75}
            />
            <SliderControl
              label="CO₂ Limit"
              storageKey="threshold_co2"
              defaultVal={420}
              unit="ppm"
              min={350}
              max={500}
              step={5}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
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
              storageKey="toggle_temp_alerts"
              defaultOn
            />
            <Toggle
              label="Humidity Alerts"
              description="Notify on humidity deviation"
              storageKey="toggle_hum_alerts"
              defaultOn
            />
            <Toggle
              label="CO₂ Alerts"
              description="Notify on elevated CO₂ levels"
              storageKey="toggle_co2_alerts"
              defaultOn
            />
            <Toggle
              label="Maintenance Reminders"
              description="Filter replacement, calibration due"
              storageKey="toggle_maintenance"
              defaultOn
            />
            <Toggle
              label="System Updates"
              description="Software and firmware updates"
              storageKey="toggle_updates"
            />
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Fan className="size-4 text-muted-foreground" />
              Airflow & Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SliderControl
              label="Air Exchange Rate"
              storageKey="slider_air_exchange"
              defaultVal={4}
              unit="/hr"
              min={1}
              max={10}
              step={0.5}
            />
            <SliderControl
              label="Fan Speed"
              storageKey="slider_fan_speed"
              defaultVal={65}
              unit="%"
              min={10}
              max={100}
              step={5}
            />
            <div className="flex flex-col gap-2 pt-1">
              <Toggle
                label="Auto-balancing"
                description="Automatic airflow adjustment"
                storageKey="toggle_auto_balance"
                defaultOn
              />
              <Toggle
                label="Night Mode"
                description="Reduced activity during dark cycle"
                storageKey="toggle_night_mode"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
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
              storageKey="toggle_telemetry"
              defaultOn
            />
            <Toggle
              label="Predictive Alerts"
              description="AI-based anomaly prediction"
              storageKey="toggle_predictive"
              defaultOn
            />
            <Toggle
              label="Camera Recording"
              description="Timelapse image capture"
              storageKey="toggle_camera"
              defaultOn
            />
            <Toggle
              label="Remote Access"
              description="External API access"
              storageKey="toggle_remote"
            />
            <Toggle
              label="Diagnostic Mode"
              description="Extended sensor logging"
              storageKey="toggle_diagnostic"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
