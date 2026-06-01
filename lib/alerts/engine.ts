import { createClient } from "@/lib/supabase/client"
import { isSupabaseWritesEnabled, disableSupabaseWrites } from "@/lib/supabase/client"
import { insertLog } from "@/lib/services/logs-service"
import { RULES, HEARTBEAT_TIMEOUT_SEC, OFFLINE_GRACE_PERIOD_SEC } from "./rules"
import type { TelemetrySnapshot, SettingsSnapshot, AlertEvent, CooldownState } from "./types"

const DEPLOYMENT_ID = "MYK-CH-001"

const cooldowns = new Map<string, CooldownState>()

function isInCooldown(ruleId: string, cooldownMs: number): boolean {
  const state = cooldowns.get(ruleId)
  if (!state) return false
  return Date.now() - state.lastTriggeredAt < cooldownMs
}

function setCooldown(ruleId: string): void {
  const state = cooldowns.get(ruleId)
  if (state) {
    state.lastTriggeredAt = Date.now()
    state.count++
  } else {
    cooldowns.set(ruleId, { lastTriggeredAt: Date.now(), count: 1 })
  }
}

async function fetchSettings(): Promise<SettingsSnapshot | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("deployment_id", DEPLOYMENT_ID)
      .single()
    if (error || !data) return null
    const row = data as Record<string, unknown>
    return {
      targetTemperature: (row.target_temperature as number) ?? 24.5,
      targetHumidity: (row.target_humidity as number) ?? 61,
      targetCo2: (row.target_co2 as number) ?? 420,
      notificationsEnabled: (row.notifications_enabled as boolean) ?? true,
    }
  } catch {
    return null
  }
}

async function fetchPreviousTelemetry(): Promise<TelemetrySnapshot | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("telemetry")
      .select("*")
      .eq("deployment_id", DEPLOYMENT_ID)
      .order("created_at", { ascending: false })
      .limit(2)
    if (error || !data || data.length < 2) return null
    const row = data[1] as Record<string, unknown>
    return {
      temperature: row.temperature as number | null,
      humidity: row.humidity as number | null,
      co2: row.co2 as number | null,
      timestamp: row.created_at as string,
    }
  } catch {
    return null
  }
}

async function hasActiveAlert(title: string): Promise<{ id: string; created_at: string } | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("alerts")
      .select("id, created_at")
      .eq("title", title)
      .eq("deployment_id", DEPLOYMENT_ID)
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(1)
    if (error || !data || data.length === 0) return null
    return data[0] as { id: string; created_at: string }
  } catch {
    return null
  }
}

async function insertAlert(event: AlertEvent): Promise<void> {
  try {
    if (!isSupabaseWritesEnabled()) return
    const supabase = createClient()
    const { error } = await supabase.from("alerts").insert({
      severity: event.severity,
      title: event.title,
      description: event.description,
      resolved: false,
      deployment_id: event.deploymentId,
    })
    if (error && (error as any)?.status >= 401 && (error as any)?.status <= 403) {
      disableSupabaseWrites()
    }
  } catch {
    // silently fail — alert engine should not block ingestion
  }
}

async function resolveAlert(title: string): Promise<void> {
  try {
    const supabase = createClient()
    await supabase
      .from("alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("title", title)
      .eq("deployment_id", DEPLOYMENT_ID)
      .eq("resolved", false)
  } catch {
    // silently fail
  }
}

export async function evaluateTelemetry(telemetry: TelemetrySnapshot): Promise<void> {
  try {
    const settings = await fetchSettings()
    if (!settings) return

    const previousTelemetry = await fetchPreviousTelemetry()

    for (const rule of RULES) {
      if (rule.id === "heartbeat-timeout" || rule.id === "device-offline") continue

      const result = rule.evaluate({ telemetry, settings, previousTelemetry: previousTelemetry ?? undefined })

      if (result.triggered) {
        if (isInCooldown(rule.id, rule.cooldownMs)) continue

        const active = await hasActiveAlert(result.title)
        if (active) {
          const age = Date.now() - new Date(active.created_at).getTime()
          if (age < rule.cooldownMs) continue
        }

        const event: AlertEvent = {
          id: crypto.randomUUID(),
          ruleId: rule.id,
          severity: rule.defaultSeverity,
          title: result.title,
          description: result.description,
          triggeredAt: new Date().toISOString(),
          deploymentId: DEPLOYMENT_ID,
        }

        await insertAlert(event)
        setCooldown(rule.id)
        insertLog(`Alert triggered: ${result.title} — ${result.description}`, "alert")
      } else {
        const ruleTitle = rule.name || rule.id
        const active = await hasActiveAlert(ruleTitle)
        if (active) {
          await resolveAlert(ruleTitle)
          insertLog(`Alert resolved: ${ruleTitle} — conditions returned to normal`, "alert")
        }
      }
    }
  } catch {
    // engine must never throw upstream
  }
}

export async function evaluateHeartbeat(timeoutSec: number = HEARTBEAT_TIMEOUT_SEC): Promise<void> {
  try {
    const supabase = createClient()
    const cutoff = new Date(Date.now() - timeoutSec * 1000).toISOString()
    const { data: staleDevices } = await supabase
      .from("devices")
      .select("device_id")
      .eq("deployment_id", DEPLOYMENT_ID)
      .neq("status", "offline")
      .lt("last_sync", cutoff)

    if (!staleDevices || staleDevices.length === 0) {
      const active = await hasActiveAlert("Heartbeat Timeout")
      if (active) {
        await resolveAlert("Heartbeat Timeout")
        insertLog("Alert resolved: Heartbeat Timeout — all devices responsive", "alert")
      }
      return
    }

    const deviceList = staleDevices.map((d) => d.device_id).join(", ")
    const title = "Heartbeat Timeout"
    const desc = `${staleDevices.length} device(s) missed heartbeat: ${deviceList}`

    if (isInCooldown("heartbeat-timeout", 300_000)) return

    const active = await hasActiveAlert(title)
    if (active) {
      const age = Date.now() - new Date(active.created_at).getTime()
      if (age < 300_000) return
    }

    const event: AlertEvent = {
      id: crypto.randomUUID(),
      ruleId: "heartbeat-timeout",
      severity: "critical",
      title,
      description: desc,
      triggeredAt: new Date().toISOString(),
      deploymentId: DEPLOYMENT_ID,
    }

    await insertAlert(event)
    setCooldown("heartbeat-timeout")
    insertLog(`Alert triggered: ${title} — ${desc}`, "alert")
  } catch {
    // silently fail
  }
}

export async function evaluateOfflineDevices(gracePeriodSec: number = OFFLINE_GRACE_PERIOD_SEC): Promise<void> {
  try {
    const supabase = createClient()
    const cutoff = new Date(Date.now() - gracePeriodSec * 1000).toISOString()
    const { data: offlineDevices } = await supabase
      .from("devices")
      .select("device_id, status")
      .eq("deployment_id", DEPLOYMENT_ID)
      .or(`status.eq.offline,status.eq.error,and(last_sync.lt.${cutoff})`)

    if (!offlineDevices || offlineDevices.length === 0) {
      const active = await hasActiveAlert("Device Offline")
      if (active) {
        await resolveAlert("Device Offline")
        insertLog("Alert resolved: Device Offline — all devices back online", "alert")
      }
      return
    }

    const deviceList = offlineDevices.map((d) => `${d.device_id} (${d.status})`).join(", ")
    const title = "Device Offline"
    const desc = `${offlineDevices.length} device(s) unreachable: ${deviceList}`

    if (isInCooldown("device-offline", 600_000)) return

    const active = await hasActiveAlert(title)
    if (active) {
      const age = Date.now() - new Date(active.created_at).getTime()
      if (age < 600_000) return
    }

    const event: AlertEvent = {
      id: crypto.randomUUID(),
      ruleId: "device-offline",
      severity: "critical",
      title,
      description: desc,
      triggeredAt: new Date().toISOString(),
      deploymentId: DEPLOYMENT_ID,
    }

    await insertAlert(event)
    setCooldown("device-offline")
    insertLog(`Alert triggered: ${title} — ${desc}`, "alert")
  } catch {
    // silently fail
  }
}
