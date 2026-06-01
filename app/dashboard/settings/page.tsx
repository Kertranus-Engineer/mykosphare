"use client"

import { useEffect, useState } from "react"
import {
  Bell,
  Cog,
  Fan,
  Monitor,
  Thermometer,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useUptime } from "@/mock/simulator"
import { DEPLOYMENT_ID, CLUSTER, REGION, SOFTWARE_VERSION, getUptime } from "@/mock/device-registry"
import { useSettings, type AppSettings } from "@/lib/services/settings-service"
import { useRealtimeSettings } from "@/lib/realtime/subscriptions"
import { RealtimeBadge } from "@/lib/realtime/status"
import { useLocale } from "@/lib/locales/locale-context"

function Toggle({
  label,
  description,
  storageKey,
  settings,
  onToggle,
}: {
  label: string
  description: string
  storageKey: string
  settings: AppSettings
  onToggle: (key: string, value: boolean) => void
}) {
  const on = settings.config[storageKey] === true
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2.5">
      <div className="flex flex-col">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <button
        type="button"
        onClick={() => onToggle(storageKey, !on)}
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
  settings,
  onChange,
}: {
  label: string
  storageKey: string
  defaultVal: number
  unit: string
  min: number
  max: number
  step?: number
  settings: AppSettings
  onChange: (key: string, value: number) => void
}) {
  const val = (settings.config[storageKey] as number) ?? defaultVal
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
        onChange={(e) => onChange(storageKey, Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted-foreground/20 accent-emerald-500"
      />
    </div>
  )
}

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(t)
  }, [])
  return mounted
}

export default function SettingsPage() {
  const mounted = useMounted()
  const { settings, updateSetting, loading, online } = useSettings()
  const { status: rtStatus, latency: rtLatency } = useRealtimeSettings()
  const { t } = useLocale()
  const uptime = useUptime()
  const uptimeStr = mounted ? (uptime > 0 ? getUptime() : "0m") : "—"

  const identityItems = [
    { label: t("settings.chamber-id"), value: DEPLOYMENT_ID },
    { label: t("settings.deployment"), value: REGION },
    { label: t("settings.software"), value: `MYKOSPHARE ${SOFTWARE_VERSION}` },
    { label: t("settings.session-uptime"), value: uptimeStr },
    { label: t("settings.cluster"), value: CLUSTER },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground/70">
            System configuration and chamber profile management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
            <div
              className={cn(
                "size-1.5 rounded-full",
                online ? "bg-emerald-500 shadow-[0_0_5px_1px] shadow-emerald-500/30" : "bg-amber-500"
              )}
            />
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
              {online ? "CLOUD SYNCED" : "LOCAL ONLY"}
            </span>
          </div>
          <RealtimeBadge status={rtStatus} latency={rtLatency} />
        </div>
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
              settings={settings}
              onChange={updateSetting}
            />
            <SliderControl
              label="Humidity Target"
              storageKey="threshold_hum"
              defaultVal={61}
              unit="%"
              min={50}
              max={75}
              settings={settings}
              onChange={updateSetting}
            />
            <SliderControl
              label="CO₂ Limit"
              storageKey="threshold_co2"
              defaultVal={420}
              unit="ppm"
              min={350}
              max={500}
              step={5}
              settings={settings}
              onChange={updateSetting}
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
              settings={settings}
              onToggle={updateSetting}
            />
            <Toggle
              label="Humidity Alerts"
              description="Notify on humidity deviation"
              storageKey="toggle_hum_alerts"
              settings={settings}
              onToggle={updateSetting}
            />
            <Toggle
              label="CO₂ Alerts"
              description="Notify on elevated CO₂ levels"
              storageKey="toggle_co2_alerts"
              settings={settings}
              onToggle={updateSetting}
            />
            <Toggle
              label="Maintenance Reminders"
              description="Filter replacement, calibration due"
              storageKey="toggle_maintenance"
              settings={settings}
              onToggle={updateSetting}
            />
            <Toggle
              label="System Updates"
              description="Software and firmware updates"
              storageKey="toggle_updates"
              settings={settings}
              onToggle={updateSetting}
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
              settings={settings}
              onChange={updateSetting}
            />
            <SliderControl
              label="Fan Speed"
              storageKey="slider_fan_speed"
              defaultVal={65}
              unit="%"
              min={10}
              max={100}
              step={5}
              settings={settings}
              onChange={updateSetting}
            />
            <div className="flex flex-col gap-2 pt-1">
              <Toggle
                label="Auto-balancing"
                description="Automatic airflow adjustment"
                storageKey="toggle_auto_balance"
                settings={settings}
                onToggle={updateSetting}
              />
              <Toggle
                label="Night Mode"
                description="Reduced activity during dark cycle"
                storageKey="toggle_night_mode"
                settings={settings}
                onToggle={updateSetting}
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
              settings={settings}
              onToggle={updateSetting}
            />
            <Toggle
              label="Predictive Alerts"
              description="AI-based anomaly prediction"
              storageKey="toggle_predictive"
              settings={settings}
              onToggle={updateSetting}
            />
            <Toggle
              label="Camera Recording"
              description="Timelapse image capture"
              storageKey="toggle_camera"
              settings={settings}
              onToggle={updateSetting}
            />
            <Toggle
              label="Remote Access"
              description="External API access"
              storageKey="toggle_remote"
              settings={settings}
              onToggle={updateSetting}
            />
            <Toggle
              label="Diagnostic Mode"
              description="Extended sensor logging"
              storageKey="toggle_diagnostic"
              settings={settings}
              onToggle={updateSetting}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Volume2 className="size-4 text-muted-foreground" />
            Operational Audio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2.5">
            <div className="flex items-center gap-2">
              {settings.config["toggle_audio"] ? (
                <Volume2 className="size-4 text-emerald-500" />
              ) : (
                <VolumeX className="size-4 text-muted-foreground/50" />
              )}
              <div className="flex flex-col">
                <span className="text-sm text-foreground">Operational Sounds</span>
                <span className="text-xs text-muted-foreground">
                  Alert pings, relay clicks, command confirmations
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSetting("toggle_audio", !settings.config["toggle_audio"])}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
                settings.config["toggle_audio"] ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "inline-block size-3.5 rounded-full bg-background shadow-sm transition-transform duration-200",
                  settings.config["toggle_audio"] ? "translate-x-[18px]" : "translate-x-[3px]"
                )}
              />
            </button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground/50">
            Muted by default. Sounds play through browser audio context.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
