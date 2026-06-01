"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseWritesEnabled, disableSupabaseWrites } from "@/lib/supabase/client"
import type { Setting } from "@/types/database"

const DEPLOYMENT_ID = "MYK-CH-001"
const LOCAL_KEY = "mykosphare_settings"

export interface SettingsConfig {
  [key: string]: string | number | boolean
}

export interface AppSettings {
  target_temperature: number
  target_humidity: number
  target_co2: number
  notifications_enabled: boolean
  config: SettingsConfig
  deployment_id: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  target_temperature: 24.5,
  target_humidity: 61,
  target_co2: 420,
  notifications_enabled: true,
  config: {
    toggle_temp_alerts: true,
    toggle_hum_alerts: true,
    toggle_co2_alerts: true,
    toggle_maintenance: true,
    toggle_updates: false,
    toggle_auto_balance: true,
    toggle_night_mode: false,
    toggle_telemetry: true,
    toggle_predictive: true,
    toggle_camera: true,
    toggle_remote: false,
    toggle_diagnostic: false,
    slider_air_exchange: 4,
    slider_fan_speed: 65,
    threshold_temp: 24.5,
    threshold_hum: 61,
    threshold_co2: 420,
  },
  deployment_id: DEPLOYMENT_ID,
}

function loadLocal(): AppSettings | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as AppSettings) : null
  } catch {
    return null
  }
}

function saveLocal(settings: AppSettings) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(settings))
  } catch {}
}

function mergeSettings(remote: AppSettings | null, local: AppSettings | null): AppSettings {
  if (remote && !local) return remote
  if (!remote && local) return local
  if (remote && local) {
    return {
      ...remote,
      config: { ...remote.config, ...local.config },
    }
  }
  return DEFAULT_SETTINGS
}

async function fetchRemote(): Promise<AppSettings | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("deployment_id", DEPLOYMENT_ID)
      .single()
    if (error || !data) return null
    const row = data as Setting
    return {
      target_temperature: row.target_temperature ?? DEFAULT_SETTINGS.target_temperature,
      target_humidity: row.target_humidity ?? DEFAULT_SETTINGS.target_humidity,
      target_co2: row.target_co2 ?? DEFAULT_SETTINGS.target_co2,
      notifications_enabled: row.notifications_enabled,
      config: (row.config as SettingsConfig) ?? {},
      deployment_id: DEPLOYMENT_ID,
    }
  } catch {
    return null
  }
}

async function upsertRemote(settings: AppSettings): Promise<boolean> {
  try {
    if (!isSupabaseWritesEnabled()) return false
    const supabase = createClient()
    const { error } = await supabase.from("settings").upsert(
      {
        target_temperature: settings.target_temperature,
        target_humidity: settings.target_humidity,
        target_co2: settings.target_co2,
        notifications_enabled: settings.notifications_enabled,
        config: settings.config as Record<string, unknown>,
        deployment_id: DEPLOYMENT_ID,
      },
      { onConflict: "deployment_id" }
    )
    if (error && (error as any)?.status >= 401 && (error as any)?.status <= 403) { disableSupabaseWrites() }
    return !error
  } catch {
    return false
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const [remote, local] = await Promise.all([fetchRemote(), Promise.resolve(loadLocal())])
      if (cancelled) return
      const merged = mergeSettings(remote, local)
      setSettings(merged)
      setOnline(!!remote)
      setLoading(false)
      if (remote) saveLocal(merged)
    }
    init()
    return () => { cancelled = true }
  }, [])

  const updateSetting = useCallback((key: string, value: string | number | boolean) => {
    setSettings((prev) => {
      const updated = { ...prev }
      if (key in updated && key !== "config" && key !== "deployment_id") {
        ;(updated as Record<string, unknown>)[key] = value
      } else {
        updated.config = { ...updated.config, [key]: value }
      }
      syncTargetThresholds(updated)
      saveLocal(updated)
      upsertRemote(updated)
      return updated
    })
  }, [])

  return { settings, updateSetting, loading, online }
}

function syncTargetThresholds(s: AppSettings) {
  s.target_temperature = (s.config.threshold_temp as number) ?? s.target_temperature
  s.target_humidity = (s.config.threshold_hum as number) ?? s.target_humidity
  s.target_co2 = (s.config.threshold_co2 as number) ?? s.target_co2
}
