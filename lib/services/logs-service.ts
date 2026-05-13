"use client"

import { createClient } from "@/lib/supabase/client"

const DEPLOYMENT_ID = "MYK-CH-001"
const LOCAL_KEY = "mykosphare_service_logs"

export interface ServiceLogEntry {
  id?: string
  created_at?: string
  message: string
  category: string | null
  deployment_id: string
}

async function getClient() {
  return createClient()
}

export async function insertLog(message: string, category: string | null = null): Promise<boolean> {
  try {
    const supabase = await getClient()
    const { error } = await supabase.from("logs").insert({
      message,
      category,
      deployment_id: DEPLOYMENT_ID,
    })
    return !error
  } catch {
    return false
  }
}

export async function insertLogBatch(entries: { message: string; category: string | null }[]): Promise<boolean> {
  if (entries.length === 0) return true
  try {
    const supabase = await getClient()
    const { error } = await supabase.from("logs").insert(
      entries.map((e) => ({
        message: e.message,
        category: e.category,
        deployment_id: DEPLOYMENT_ID,
      }))
    )
    return !error
  } catch {
    return false
  }
}

export async function fetchLogs(limit = 50): Promise<ServiceLogEntry[]> {
  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .eq("deployment_id", DEPLOYMENT_ID)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  } catch {
    return loadLocalLogs()
  }
}

export function loadLocalLogs(): ServiceLogEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as ServiceLogEntry[]) : []
  } catch {
    return []
  }
}

export function saveLocalLogs(logs: ServiceLogEntry[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(logs.slice(0, 100)))
  } catch {}
}

export function appendLocalLog(entry: ServiceLogEntry) {
  const existing = loadLocalLogs()
  saveLocalLogs([entry, ...existing])
}
