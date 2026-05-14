import { createClient } from "@/lib/supabase/client"
import type { FrequencyRecord, AlertSummary } from "./types"

const DEPLOYMENT_ID = "MYK-CH-001"

export async function getAlertFrequency(since: string): Promise<FrequencyRecord[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("alerts")
      .select("title, created_at, resolved_at")
      .eq("deployment_id", DEPLOYMENT_ID)
      .gte("created_at", since)
    if (error || !data) return []

    const counts = new Map<string, { count: number; last: string | null; totalDurationMs: number; resolvedCount: number }>()
    for (const row of data) {
      const r = row as Record<string, unknown>
      const key = r.title as string
      if (!key) continue
      const existing = counts.get(key) ?? { count: 0, last: null, totalDurationMs: 0, resolvedCount: 0 }
      existing.count++
      const ts = r.created_at as string
      if (!existing.last || ts > existing.last) existing.last = ts
      const resolvedAt = r.resolved_at as string | null
      if (resolvedAt) {
        existing.totalDurationMs += new Date(resolvedAt).getTime() - new Date(ts).getTime()
        existing.resolvedCount++
      }
      counts.set(key, existing)
    }

    return Array.from(counts.entries()).map(([title, info]) => ({
      ruleId: title,
      title,
      count24h: info.count,
      lastTriggered: info.last,
      avgDurationMs: info.resolvedCount > 0 ? Math.round(info.totalDurationMs / info.resolvedCount) : null,
    })).sort((a, b) => b.count24h - a.count24h)
  } catch {
    return []
  }
}

export async function getAlertSummary(): Promise<AlertSummary> {
  try {
    const supabase = createClient()
    const { data: active } = await supabase
      .from("alerts")
      .select("id")
      .eq("deployment_id", DEPLOYMENT_ID)
      .eq("resolved", false)

    const { data: total } = await supabase
      .from("alerts")
      .select("id")
      .eq("deployment_id", DEPLOYMENT_ID)

    const { data: critical } = await supabase
      .from("alerts")
      .select("id")
      .eq("deployment_id", DEPLOYMENT_ID)
      .eq("resolved", false)
      .eq("severity", "critical")

    const { data: resolved } = await supabase
      .from("alerts")
      .select("created_at, resolved_at")
      .eq("deployment_id", DEPLOYMENT_ID)
      .eq("resolved", true)
      .not("resolved_at", "is", null)

    let avgResolutionMs: number | null = null
    if (resolved && resolved.length > 0) {
      let totalDuration = 0
      for (const r of resolved) {
        const row = r as Record<string, unknown>
        const created = new Date(row.created_at as string).getTime()
        const resolvedAt = new Date(row.resolved_at as string).getTime()
        totalDuration += resolvedAt - created
      }
      avgResolutionMs = Math.round(totalDuration / resolved.length)
    }

    return {
      active: active?.length ?? 0,
      total: total?.length ?? 0,
      criticalUnresolved: critical?.length ?? 0,
      avgResolutionMs,
    }
  } catch {
    return { active: 0, total: 0, criticalUnresolved: 0, avgResolutionMs: null }
  }
}

export async function getAlertTimeSeries(hours: number = 24): Promise<{ hour: string; count: number }[]> {
  try {
    const supabase = createClient()
    const since = new Date(Date.now() - hours * 3600_000).toISOString()
    const { data, error } = await supabase
      .from("alerts")
      .select("created_at")
      .eq("deployment_id", DEPLOYMENT_ID)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
    if (error || !data) return []

    const buckets = new Map<string, number>()
    for (const row of data) {
      const r = row as Record<string, unknown>
      const d = new Date(r.created_at as string)
      const hour = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`
      buckets.set(hour, (buckets.get(hour) ?? 0) + 1)
    }

    return Array.from(buckets.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
  } catch {
    return []
  }
}
