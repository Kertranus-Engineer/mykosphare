"use client"

import { useMemo, useCallback, useState, useEffect, useRef } from "react"
import { createInitialTwinState, evolveTwinState, computeChamberHealth, switchOperationalMode } from "./engine"
import type { ChamberTwinState, OperationalMode, ChamberHealth } from "./types"
import { useRealtimeTelemetry, useRealtimeAlerts, useRealtimeDevices } from "@/lib/realtime/subscriptions"

export interface UseTwinResult {
  chamberState: ChamberTwinState
  health: ChamberHealth
  mode: OperationalMode
  switchMode: (mode: OperationalMode) => void
}

export interface TwinExternalData {
  activeAlerts?: boolean
  activeIncidents?: boolean
  maintenanceTasks?: boolean
  avgDeviceHealth?: number
}

const CHAMBER_ID = "MYK-CH-001"

export function useTwin(externalData?: TwinExternalData): UseTwinResult {
  const { data: telemetry } = useRealtimeTelemetry(10)
  const { data: rtAlerts } = useRealtimeAlerts(50)
  const { data: devices } = useRealtimeDevices()

  const [chamberState, setChamberState] = useState<ChamberTwinState>(() =>
    createInitialTwinState(CHAMBER_ID)
  )

  const tickRef = useRef(0)

  const latestTelemetry = useMemo(() => {
    if (telemetry.length === 0) return { temperature: 24.5, humidity: 61, co2: 420 }
    const latest = telemetry[0]
    return {
      temperature: latest.temperature ?? 24.5,
      humidity: latest.humidity ?? 61,
      co2: latest.co2 ?? 420,
    }
  }, [telemetry])

  const activeAlerts = externalData?.activeAlerts !== undefined
    ? externalData.activeAlerts
    : rtAlerts.some((a) => !a.resolved)

  const activeIncidents = externalData?.activeIncidents !== undefined
    ? externalData.activeIncidents
    : rtAlerts.filter((a) => !a.resolved && a.severity === "critical").length > 2

  const maintenanceTasks = externalData?.maintenanceTasks !== undefined
    ? externalData.maintenanceTasks
    : false

  const avgDeviceHealth = externalData?.avgDeviceHealth !== undefined
    ? externalData.avgDeviceHealth
    : devices.length > 0
      ? Math.round(devices.reduce((s, d) => s + (d.health ?? 100), 0) / devices.length)
      : 85

  useEffect(() => {
    tickRef.current++
    const interval = setInterval(() => {
      setChamberState((prev) => {
        const evolved = evolveTwinState(prev, latestTelemetry, activeAlerts, activeIncidents, maintenanceTasks, avgDeviceHealth)
        const health = computeChamberHealth(evolved, latestTelemetry)
        return { ...evolved, healthScore: health.overallScore }
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [latestTelemetry, activeAlerts, activeIncidents, maintenanceTasks, avgDeviceHealth])

  const health = useMemo(() => computeChamberHealth(chamberState, latestTelemetry), [chamberState, latestTelemetry])

  const switchMode = useCallback((newMode: OperationalMode) => {
    setChamberState((prev) => switchOperationalMode(prev, newMode))
  }, [])

  return {
    chamberState,
    health,
    mode: chamberState.mode,
    switchMode,
  }
}
