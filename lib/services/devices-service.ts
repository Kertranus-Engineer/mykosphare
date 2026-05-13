"use client"

import { createClient } from "@/lib/supabase/client"

const DEPLOYMENT_ID = "MYK-CH-001"
const LOCAL_KEY = "mykosphare_service_devices"

export interface ServiceDevice {
  id?: string
  created_at?: string
  device_id: string
  device_type: string | null
  status: string | null
  health: number | null
  uptime: number | null
  last_sync: string | null
  deployment_id: string
}

async function getClient() {
  return createClient()
}

export async function upsertDevice(
  device_id: string,
  device_type: string | null,
  status: string | null,
  health: number | null,
  uptime: number | null
): Promise<boolean> {
  try {
    const supabase = await getClient()
    const { error } = await supabase.from("devices").upsert(
      {
        device_id,
        device_type,
        status,
        health,
        uptime,
        last_sync: new Date().toISOString(),
        deployment_id: DEPLOYMENT_ID,
      },
      { onConflict: "device_id" }
    )
    return !error
  } catch {
    return false
  }
}

export async function upsertDeviceBatch(devices: ServiceDevice[]): Promise<boolean> {
  if (devices.length === 0) return true
  try {
    const supabase = await getClient()
    const { error } = await supabase
      .from("devices")
      .upsert(devices, { onConflict: "device_id" })
    return !error
  } catch {
    return false
  }
}

export async function fetchDevices(): Promise<ServiceDevice[]> {
  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .eq("deployment_id", DEPLOYMENT_ID)
      .order("device_id", { ascending: true })
    if (error) throw error
    return data ?? []
  } catch {
    return loadLocalDevices()
  }
}

export function loadLocalDevices(): ServiceDevice[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as ServiceDevice[]) : []
  } catch {
    return []
  }
}

export function saveLocalDevices(devices: ServiceDevice[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(devices))
  } catch {}
}
