import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { HomeRepository } from "./home-read"

/** User session + RLS + explicit owner scoping. No administrative client. */
export function createHomeRepository(db: SupabaseClient): HomeRepository {
  return {
    async findOwnedChamber(ownerId, chamberId) {
      let query = db.from("grow_chambers").select("id,name").eq("owner_id", ownerId)
      if (chamberId) query = query.eq("id", chamberId)
      const { data, error } = await query.order("created_at").order("id").limit(1).maybeSingle()
      if (error) throw error
      return data
    },
    async findDevice(chamberId) {
      const { data, error } = await db.from("grow_devices").select("id,name,enabled,last_seen_at").eq("chamber_id", chamberId).eq("device_type", "controller").order("created_at").order("id").limit(1).maybeSingle()
      if (error) throw error
      return data ? { id: data.id, name: data.name, enabled: data.enabled, lastSeenAt: data.last_seen_at } : null
    },
    async readings(chamberId, deviceId) {
      const { data, error } = await db.from("grow_readings").select("observed_at,temperature,humidity").eq("chamber_id", chamberId).eq("device_id", deviceId).eq("origin", "real").order("observed_at", { ascending: false }).limit(120)
      if (error) throw error
      return (data ?? []).map(row => ({ observedAt: row.observed_at, temperature: row.temperature === null ? null : Number(row.temperature), humidity: row.humidity === null ? null : Number(row.humidity) }))
    },
  }
}
