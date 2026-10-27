import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { createSupabaseIngestionStore } from "../application/supabase-repository"
import type { PublishStore, SyncStore } from "./handlers"
import { CONFIG_COLUMNS, toDesired } from "./mapping"

/** Service-role store for device control (server only). Ownership is resolved here, never taken from the request. */

export function createSupabaseSyncStore(): SyncStore {
  const db = createAdminClient()
  return {
    ...createSupabaseIngestionStore(),
    async getLatestConfig(deviceId) {
      const { data, error } = await db.from("grow_device_configs").select(CONFIG_COLUMNS).eq("device_id", deviceId).order("version", { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return data ? toDesired(data) : null
    },
    async recordReport({ deviceId, report, receivedAt }) {
      // Reported state lives in the existing grow_device_state row: config_version is the version actually APPLIED.
      const { error } = await db.from("grow_device_state").upsert({
        device_id: deviceId,
        config_version: report.appliedVersion === null ? null : String(report.appliedVersion),
        firmware_version: report.firmware,
        reported_actuators: {
          receivedVersion: report.receivedVersion, appliedVersion: report.appliedVersion, mode: report.mode, controller: report.controller,
          lastError: report.lastError, bootId: report.bootId, uptimeSeconds: report.uptimeSeconds, reportedAt: receivedAt,
        },
        updated_at: receivedAt,
      }, { onConflict: "device_id" })
      if (error) throw error
      if (report.events.length) {
        const { error: eventError } = await db.from("grow_device_events").upsert(
          report.events.map(e => ({ device_id: deviceId, event_key: `${report.bootId}:${e.key}`.slice(0, 64), occurred_at: e.at, kind: e.kind, simulated: e.simulated, config_version: e.version, detail: e.detail })),
          { onConflict: "device_id,event_key", ignoreDuplicates: true },
        )
        if (eventError) throw eventError
      }
    },
  }
}

export function createSupabasePublishStore(): PublishStore {
  const db = createAdminClient()
  return {
    async findDeviceForOwner(ownerId) {
      const { data, error } = await db.from("grow_devices").select("id, enabled, grow_chambers!inner(owner_id)").eq("device_type", "controller").eq("grow_chambers.owner_id", ownerId).order("created_at").limit(1).maybeSingle()
      if (error) throw error
      return data ? { id: data.id, enabled: data.enabled !== false } : null
    },
    async publishConfig(input) {
      const { data, error } = await db.rpc("grow_publish_device_config", {
        p_device_id: input.deviceId, p_mode: input.mode, p_targets: input.targets, p_capabilities: input.capabilities, p_note: input.note, p_created_by: input.createdBy,
      })
      if (error || typeof data !== "number") throw error ?? new Error("invalid publish response")
      return data
    },
  }
}
