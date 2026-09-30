import { createAdminClient } from "@/lib/supabase/admin"
import type { DeviceReadingInput } from "./validation"

export type DeviceIngestionResult = { status: "accepted" | "duplicate" } | { status: "unknown_device" }

/** Server-only v2 write path. Origin is fixed as real and never comes from device JSON. */
export async function ingestDeviceReading(input: DeviceReadingInput): Promise<DeviceIngestionResult> {
  const db = createAdminClient()
  const { data: device, error: deviceError } = await db.from("grow_devices").select("id, chamber_id").eq("hardware_identifier", input.deviceId).maybeSingle()
  if (deviceError) throw deviceError
  if (!device) return { status: "unknown_device" }
  const { data: run, error: runError } = await db.from("grow_cultivation_runs").select("id").eq("chamber_id", device.chamber_id).eq("status", "active").maybeSingle()
  if (runError) throw runError
  const { error: insertError } = await db.from("grow_readings").insert({
    device_id: device.id, chamber_id: device.chamber_id, run_id: run?.id ?? null,
    observed_at: input.observedAt, origin: "real", temperature: input.temperature ?? null, humidity: input.humidity ?? null,
  })
  if (insertError) {
    if (insertError.code === "23505") return { status: "duplicate" }
    throw insertError
  }
  const now = new Date().toISOString()
  const { error: stateError } = await db.from("grow_device_state").upsert({ device_id: device.id, status: "online", last_seen_at: now, updated_at: now }, { onConflict: "device_id" })
  if (stateError) throw stateError
  const { error: seenError } = await db.from("grow_devices").update({ last_seen_at: now }).eq("id", device.id)
  if (seenError) throw seenError
  return { status: "accepted" }
}
