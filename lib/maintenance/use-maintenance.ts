"use client"

import { useMemo, useCallback, useState } from "react"
import { useRealtimeDevices, useRealtimeAlerts } from "@/lib/realtime/subscriptions"
import { generateAllRecommendations } from "./engine"
import { computeMaintenanceSummary } from "./scoring"
import { computeMttrMetrics, computeReliabilityAnalytics } from "./analytics"
import { calculateDeviceReliability } from "@/lib/intelligence/reliability"
import { calculateAlertDensity } from "@/lib/intelligence/analytics"
import type { MaintenanceRecommendation, MaintenanceStatus, MaintenanceSummary, MttrMetrics, ReliabilityAnalytics } from "./types"
import type { Incident } from "@/lib/incidents/types"
import type { DriftAnalysis } from "@/lib/temporal/types"
import type { DeviceReliabilityScore, AlertDensityMetrics } from "@/lib/intelligence/types"

export interface UseMaintenanceResult {
  recommendations: MaintenanceRecommendation[]
  summary: MaintenanceSummary
  mttr: MttrMetrics
  reliability: ReliabilityAnalytics
  actions: {
    schedule: (id: string, scheduledAt: string) => void
    startWork: (id: string) => void
    complete: (id: string) => void
  }
}

export interface MaintenanceExternalData {
  incidents?: Incident[]
  drifts?: DriftAnalysis[]
  reliability?: DeviceReliabilityScore
  alertDensity?: AlertDensityMetrics
}

export function useMaintenance(externalData?: MaintenanceExternalData): UseMaintenanceResult {
  const { data: devices } = useRealtimeDevices()
  const { data: rtAlerts } = useRealtimeAlerts(200)

  const [userModifications, setUserModifications] = useState<Record<string, { status: MaintenanceStatus; scheduledAt: string | null; completedAt: string | null }>>({})

  const deviceData = useMemo(() =>
    devices.map((d) => ({
      deviceId: d.device_id ?? d.id ?? "unknown",
      health: d.health ?? 50,
      uptime: d.uptime ?? 0,
      status: d.status ?? "unknown",
    })),
    [devices]
  )

  const incidents = externalData?.incidents ?? []
  const drifts = externalData?.drifts ?? []

  const reliability = externalData?.reliability ?? calculateDeviceReliability({
    devices: devices.map((d) => ({
      status: d.status,
      health: d.health,
      uptime: d.uptime,
      last_sync: d.last_sync ?? null,
    })),
    heartbeatTimestamps: [],
  })

  const alertDensity = externalData?.alertDensity ?? calculateAlertDensity(
    rtAlerts.map((a) => ({
      severity: a.severity,
      created_at: a.created_at,
      resolved_at: a.resolved_at ?? null,
    })),
    24
  )

  const baseRecommendations = useMemo(() =>
    generateAllRecommendations(incidents, drifts, deviceData, reliability, alertDensity),
    [incidents, drifts, deviceData, reliability, alertDensity]
  )

  const recommendations: MaintenanceRecommendation[] = useMemo(() => {
    const merged = [...baseRecommendations]
    for (const rec of merged) {
      const mod = userModifications[rec.id]
      if (mod) {
        rec.status = mod.status
        if (mod.scheduledAt) rec.scheduledAt = mod.scheduledAt
        if (mod.completedAt) rec.completedAt = mod.completedAt
        rec.updatedAt = new Date().toISOString()
      }
    }
    return merged
  }, [baseRecommendations, userModifications])

  const schedule = useCallback((id: string, scheduledAt: string) => {
    setUserModifications((prev) => ({ ...prev, [id]: { status: "scheduled" as MaintenanceStatus, scheduledAt, completedAt: null } }))
  }, [])

  const startWork = useCallback((id: string) => {
    setUserModifications((prev) => ({ ...prev, [id]: { status: "in_progress" as MaintenanceStatus, scheduledAt: prev[id]?.scheduledAt ?? null, completedAt: null } }))
  }, [])

  const complete = useCallback((id: string) => {
    setUserModifications((prev) => ({ ...prev, [id]: { status: "completed" as MaintenanceStatus, scheduledAt: prev[id]?.scheduledAt ?? null, completedAt: new Date().toISOString() } }))
  }, [])

  const summary = useMemo(() => computeMaintenanceSummary(recommendations), [recommendations])
  const mttr = useMemo(() => computeMttrMetrics(incidents, recommendations), [incidents, recommendations])
  const reliabilityAnalytics = useMemo(() => computeReliabilityAnalytics(incidents, recommendations, deviceData.length), [incidents, recommendations, deviceData.length])

  return {
    recommendations,
    summary,
    mttr,
    reliability: reliabilityAnalytics,
    actions: { schedule, startWork, complete },
  }
}
