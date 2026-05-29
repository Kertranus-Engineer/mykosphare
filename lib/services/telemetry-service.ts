"use client"

import { createClient, isSupabaseWritesEnabled, disableSupabaseWrites } from "@/lib/supabase/client"

const DEPLOYMENT_ID = "MYK-CH-001"
const LOCAL_KEY = "mykosphare_telemetry_buffer"
const MAX_LOCAL = 500

export interface TelemetryRow {
  id: string
  created_at: string
  temperature: number | null
  humidity: number | null
  co2: number | null
  energy_usage: number | null
  environmental_state: string | null
  operational_mode: string | null
  deployment_id: string | null
}

export interface TelemetryInsert {
  temperature: number
  humidity: number
  co2: number
  energy_usage: number
  environmental_state: string
  operational_mode: string
  deployment_id: string
}

function getClient() {
  return createClient()
}

function loadLocalBuffer(): TelemetryRow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as TelemetryRow[]) : []
  } catch {
    return []
  }
}

function saveLocalBuffer(rows: TelemetryRow[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows.slice(0, MAX_LOCAL)))
  } catch {}
}

export async function insertTelemetry(
  temperature: number,
  humidity: number,
  co2: number,
  energy_usage: number,
  environmental_state: string,
  operational_mode: string
): Promise<boolean> {
  const row: TelemetryInsert = {
    temperature,
    humidity,
    co2,
    energy_usage,
    environmental_state,
    operational_mode,
    deployment_id: DEPLOYMENT_ID,
  }

  const localEntry: TelemetryRow = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    temperature,
    humidity,
    co2,
    energy_usage,
    environmental_state,
    operational_mode,
    deployment_id: DEPLOYMENT_ID,
  }
  const buf = loadLocalBuffer()
  saveLocalBuffer([localEntry, ...buf])

  try {
    if (!isSupabaseWritesEnabled()) return false
    const supabase = getClient()
    const { error } = await supabase.from("telemetry").insert(row)
    if (error && (error as any)?.status >= 401 && (error as any)?.status <= 403) {
      disableSupabaseWrites()
      return false
    }
    return !error
  } catch {
    return false
  }
}

export async function insertTelemetryBatch(
  rows: { temperature: number; humidity: number; co2: number; energy_usage: number; environmental_state: string; operational_mode: string }[]
): Promise<boolean> {
  if (rows.length === 0) return true
  const inserts = rows.map((r) => ({
    ...r,
    deployment_id: DEPLOYMENT_ID,
  }))
  try {
    if (!isSupabaseWritesEnabled()) return false
    const supabase = getClient()
    const { error } = await supabase.from("telemetry").insert(inserts)
    if (error && (error as any)?.status >= 401 && (error as any)?.status <= 403) {
      disableSupabaseWrites()
      return false
    }
    return !error
  } catch {
    return false
  }
}

export async function fetchRecentTelemetry(limit = 100): Promise<TelemetryRow[]> {
  try {
    const supabase = getClient()
    const { data, error } = await supabase
      .from("telemetry")
      .select("*")
      .eq("deployment_id", DEPLOYMENT_ID)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return data as TelemetryRow[]
  } catch {
    return loadLocalBuffer().slice(0, limit)
  }
}

export async function fetchTelemetryRange(
  from: string,
  to: string,
  limit = 500
): Promise<TelemetryRow[]> {
  try {
    const supabase = getClient()
    const { data, error } = await supabase
      .from("telemetry")
      .select("*")
      .eq("deployment_id", DEPLOYMENT_ID)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return data as TelemetryRow[]
  } catch {
    const buf = loadLocalBuffer()
    return buf.filter((r) => r.created_at >= from && r.created_at <= to).slice(0, limit)
  }
}

export async function latestTelemetrySnapshot(): Promise<TelemetryRow | null> {
  try {
    const supabase = getClient()
    const { data, error } = await supabase
      .from("telemetry")
      .select("*")
      .eq("deployment_id", DEPLOYMENT_ID)
      .order("created_at", { ascending: false })
      .limit(1)
    if (error) throw error
    return (data && data.length > 0 ? data[0] : null) as TelemetryRow | null
  } catch {
    const buf = loadLocalBuffer()
    return buf.length > 0 ? buf[0] : null
  }
}
