"use client"

import { useEffect, useMemo, useState } from "react"
import {
  useDashboardTelemetry,
  useRealTimeTelemetry,
  useTelemetryHistory,
  type HistoryPoint,
} from "@/lib/useTelemetry"
import { useRealEnvironment, type EnvironmentState } from "@/lib/useEnvironment"

export type DataSource = "live" | "simulated" | "none"

export type ConnectionKind =
  | "connecting"
  | "live"
  | "simulated"
  | "stale"
  | "degraded"
  | "offline"

export interface MetricReading {
  /** null until the first valid sample arrives. */
  value: number | null
  trend: "up" | "down" | "stable"
  delta: number
  /** Status text/colour come from the shared environment engine (chamberIndicators). */
  status: string | null
  statusColor: string
}

export interface MobileTelemetry {
  source: DataSource
  connection: { kind: ConnectionKind; label: string }
  /** True when values on screen are not fresh (offline / stale). */
  dimmed: boolean
  hasData: boolean
  temperature: MetricReading
  humidity: MetricReading
  fan: boolean | null
  humidifier: boolean | null
  /**
   * CO₂ is intentionally always null: the device payload (/api/data) carries
   * only temp / hum / fan / humidifier. The dashboard's "CO₂" is a formula
   * derived from temp & hum, which is not a measurement.
   */
  co2: null
  /** ISO time the server last received a device sample (live source only). */
  lastDeviceSampleAt: string | null
  /** Shared environment engine output (state, alerts, indicators). */
  env: EnvironmentState
  /** False while the shared engine has not yet caught up with the stream. */
  envReady: boolean
  /** In-session real samples, oldest → newest. */
  history: HistoryPoint[]
}

const CONNECTING_GRACE_MS = 8000

const CONNECTION_LABEL: Record<ConnectionKind, string> = {
  connecting: "Conectando",
  live: "En vivo",
  simulated: "Simulación",
  stale: "Sin señal reciente",
  degraded: "Degradado",
  offline: "Sin conexión",
}

export function useMobileTelemetry(): MobileTelemetry {
  const rt = useRealTimeTelemetry()
  const dash = useDashboardTelemetry()
  const env = useRealEnvironment()
  const rawHistory = useTelemetryHistory()
  const [graceOver, setGraceOver] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setGraceOver(true), CONNECTING_GRACE_MS)
    return () => clearTimeout(t)
  }, [])

  return useMemo<MobileTelemetry>(() => {
    const hasData = rt.temp > 0 || rt.hum > 0

    let kind: ConnectionKind
    if (rt.updatedAt === null && !rt.online) kind = graceOver ? "offline" : "connecting"
    else if (!rt.online) kind = "offline"
    else if (!hasData) kind = "connecting"
    else if (rt.source === "live" && rt.stale) kind = "stale"
    else if (rt.degraded) kind = "degraded"
    else if (rt.source === "simulated") kind = "simulated"
    else if (rt.source === "live") kind = "live"
    else kind = "offline"

    // The shared dashboard hook can lag behind the raw stream (it only
    // recomputes when a value changes). Don't present a state derived from
    // zeroed metrics as if it were real.
    const envReady = !hasData || dash.hasRealData

    const indicator = (label: string) => env.chamberIndicators.find((i) => i.label === label)
    const tempInd = indicator("Temperature")
    const humInd = indicator("Humidity")

    // The shared hook diffs against its zeroed initial state on the very first
    // sample (e.g. "+22.9"). A trend only means something from the 2nd sample on.
    const trendReliable = rawHistory.length >= 2

    const reading = (
      raw: number,
      m: { trend: "up" | "down" | "stable"; delta: number },
      ind: { status: string; color: string } | undefined,
    ): MetricReading => ({
      value: raw > 0 ? raw : null,
      trend: trendReliable ? m.trend : "stable",
      delta: trendReliable ? m.delta : 0,
      status: raw > 0 && envReady && ind ? ind.status : null,
      statusColor: ind?.color ?? "text-muted-foreground",
    })

    return {
      source: rt.source,
      connection: { kind, label: CONNECTION_LABEL[kind] },
      dimmed: kind === "offline" || kind === "stale",
      hasData,
      temperature: reading(rt.temp, dash.temperature, tempInd),
      humidity: reading(rt.hum, dash.humidity, humInd),
      fan: rt.fan,
      humidifier: rt.humidifier,
      co2: null,
      lastDeviceSampleAt: rt.source === "live" ? rt.serverReceivedAt : null,
      env,
      envReady,
      history: [...rawHistory].reverse(),
    }
  }, [rt, dash, env, rawHistory, graceOver])
}
