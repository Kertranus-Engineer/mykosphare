"use client"

import { useMemo } from "react"
import { useRealtimeTelemetry, useRealtimeAlerts, useRealtimeDevices } from "@/lib/realtime/subscriptions"
import { generateTemporalSummary } from "./summaries"
import type { TemporalSummary } from "./types"

export function useTemporalIntelligence(): TemporalSummary & { connected: boolean } {
  const { data: telemetry, status: telStatus } = useRealtimeTelemetry(200)
  const { data: alerts } = useRealtimeAlerts(200)
  const { data: devices } = useRealtimeDevices()
  const connected = telStatus === "live"

  return useMemo(() => {
    const summary = generateTemporalSummary(
      {
        telemetry: telemetry.map((t) => ({
          created_at: t.created_at,
          temperature: t.temperature,
          humidity: t.humidity,
          co2: t.co2,
          energy_usage: t.energy_usage ?? null,
          environmental_state: t.environmental_state,
        })),
        alerts: alerts.map((a) => ({
          severity: a.severity,
          created_at: a.created_at,
          title: a.title,
          description: a.description,
        })),
        devices: devices.map((d) => ({
          status: d.status,
          health: d.health,
          uptime: d.uptime,
          device_id: d.device_id,
          last_sync: d.last_sync,
        })),
      },
      ["1h", "6h", "24h", "7d"]
    )
    return { ...summary, connected }
  }, [telemetry, alerts, devices, connected])
}
