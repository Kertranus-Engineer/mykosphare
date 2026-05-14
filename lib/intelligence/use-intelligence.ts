"use client"

import { useMemo } from "react"
import { useRealtimeTelemetry } from "@/lib/realtime/subscriptions"
import { useRealtimeAlerts } from "@/lib/realtime/subscriptions"
import { useRealtimeDevices } from "@/lib/realtime/subscriptions"
import { generateOperationalSummary } from "./summaries"
import type { OperationalSummary } from "./types"

const DEFAULT_TARGET_TEMP = 24.5
const DEFAULT_TARGET_HUM = 61
const DEFAULT_TARGET_CO2 = 420

export function useOperationalIntelligence(): OperationalSummary {
  const { data: telemetry, status: telStatus } = useRealtimeTelemetry(200)
  const { data: alerts } = useRealtimeAlerts(200)
  const { data: devices } = useRealtimeDevices()

  const connected = telStatus === "live"

  return useMemo(() => {
    const summary = generateOperationalSummary(
      {
        telemetryRows: telemetry.map((t) => ({
          temperature: t.temperature,
          humidity: t.humidity,
          co2: t.co2,
          energy_usage: t.energy_usage ?? null,
          environmental_state: t.environmental_state,
          created_at: t.created_at,
        })),
        alerts: alerts.map((a) => ({
          severity: a.severity,
          created_at: a.created_at,
          resolved_at: a.resolved_at ?? null,
        })),
        devices: devices.map((d) => ({
          status: d.status,
          health: d.health,
          uptime: d.uptime,
          last_sync: d.last_sync ?? null,
        })),
        heartbeatTimestamps: [],
        targetTemp: DEFAULT_TARGET_TEMP,
        targetHum: DEFAULT_TARGET_HUM,
        targetCo2: DEFAULT_TARGET_CO2,
      },
      { alertAnalysisHours: 24, rollingPeriodMinutes: 60, connected }
    )
    return summary
  }, [telemetry, alerts, devices, connected])
}
