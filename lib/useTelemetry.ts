"use client"

import { useEffect, useRef, useState } from "react"
import { emitOpEvent } from "@/lib/events/bus"
import { startAmbientChatter, stopAmbientChatter } from "@/lib/events/bus"

export interface RealTimeTelemetry {
  temp: number
  hum: number
  fan: boolean | null
  humidifier: boolean | null
  online: boolean
  degraded: boolean
  updatedAt: string | null
  heartbeat: string | null
  serverReceivedAt: string | null
  freshnessMs: number
  stale: boolean
  source: "esp32" | "demo" | "none"
}

interface HistoryPoint {
  time: string
  temperature: number
  humidity: number
}

const MAX_HISTORY = 30
const POLL_INTERVAL = 3000
const WATCHDOG_TIMEOUT = 15000

let globalState: RealTimeTelemetry = {
  temp: 0,
  hum: 0,
  fan: null,
  humidifier: null,
  online: false,
  degraded: false,
  updatedAt: null,
  heartbeat: null,
  serverReceivedAt: null,
  freshnessMs: 0,
  stale: false,
  source: "none",
}

let history: HistoryPoint[] = []
let lastFetchTime: number | null = null
let lastSuccessfulFetch: number = 0
const listeners = new Set<() => void>()
let demoActive = false
let retryCount = 0
let pollInterval: ReturnType<typeof setInterval> | null = null
let watchdogInterval: ReturnType<typeof setInterval> | null = null
let abortController: AbortController | null = null

function notify() {
  listeners.forEach((l) => l())
}

async function fetchTelemetry() {
  abortController?.abort()
  abortController = new AbortController()
  const signal = abortController.signal

  try {
    const url = demoActive ? "/api/demo" : "/api/data"
    const res = await fetch(url, { signal })

    if (res.ok) {
      const data = await res.json()

      const hasTemp = typeof data.temp === "number" && isFinite(data.temp)
      const hasHum = typeof data.hum === "number" && isFinite(data.hum)
      const hasValidData = hasTemp && hasHum && (data.temp > 0 || data.hum > 0)
      const hasHeartbeat = typeof data.heartbeat === "string" && data.heartbeat.length > 0

      if (typeof data.temp === "number" && typeof data.hum === "number") {
        const wasOffline = !globalState.online
        const now = new Date()
        const time = now.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })

        // Determine source: ESP32 if heartbeat exists OR we have valid sensor data
        const isEsp32 = hasHeartbeat || (!demoActive && hasValidData)
        // Determine online: ESP32 source AND (has heartbeat OR valid data with freshness)
        const isOnline = demoActive || (isEsp32 && (hasHeartbeat || hasValidData))

        const newState: RealTimeTelemetry = {
          temp: Math.round(data.temp * 10) / 10,
          hum: Math.round(data.hum * 10) / 10,
          fan: data.fan ?? null,
          humidifier: data.humidifier ?? null,
          online: isOnline,
          degraded: false,
          updatedAt: now.toISOString(),
          heartbeat: data.heartbeat ?? null,
          serverReceivedAt: data.serverReceivedAt ?? null,
          freshnessMs: typeof data.freshnessMs === "number" ? data.freshnessMs : 0,
          stale: data.stale === true,
          source: demoActive ? "demo" : isEsp32 ? "esp32" : "none",
        }

        // [TEL] Instrumentacion — estado completo en cada poll exitoso

        globalState = newState

        lastFetchTime = Date.now()
        lastSuccessfulFetch = Date.now()
        retryCount = 0

        if (wasOffline && isOnline && hasValidData) {
          emitOpEvent("telemetry", "Stream reconnected", "success")
          emitOpEvent("system", "Operational state restored", "success")
        }

        if (!demoActive && hasValidData) {
          history = [
            { time, temperature: globalState.temp, humidity: globalState.hum },
            ...history,
          ].slice(0, MAX_HISTORY)
        }

        notify()
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") return
    const elapsed = lastFetchTime ? Date.now() - lastFetchTime : 0
    retryCount++
    if (retryCount % 3 === 0) {
      emitOpEvent("telemetry", `Retry attempt ${retryCount}`, "warning")
    }
    if (elapsed > 12000) {
      if (globalState.online) {
        emitOpEvent("telemetry", "Connection lost — entering degraded mode", "critical")
      }
      globalState = { ...globalState, online: false, degraded: false, stale: true }
      notify()
    } else if (elapsed > 6000 && !globalState.degraded && globalState.online) {
      console.log("[TEL] transition: ONLINE → DEGRADED (6s+ no response)")
      emitOpEvent("telemetry", "Stream integrity degraded — monitoring", "warning")
      globalState = { ...globalState, degraded: true, stale: true }
      notify()
    }
  }
}

function startPolling() {
  if (pollInterval) return
  fetchTelemetry()
  pollInterval = setInterval(fetchTelemetry, POLL_INTERVAL)
  startAmbientChatter()
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  stopAmbientChatter()
}

function startWatchdog() {
  if (watchdogInterval) return
  watchdogInterval = setInterval(() => {
    const elapsed = Date.now() - lastSuccessfulFetch
    if (elapsed > WATCHDOG_TIMEOUT && lastSuccessfulFetch > 0) {
      if (globalState.online) {
        globalState = { ...globalState, stale: true }
        notify()
      }
      stopPolling()
      startPolling()
    }
  }, 5000)
}

function stopWatchdog() {
  if (watchdogInterval) {
    clearInterval(watchdogInterval)
    watchdogInterval = null
  }
}

export function setDemoActive(active: boolean) {
  demoActive = active
  if (!active && lastSuccessfulFetch === 0) {
    globalState = { ...globalState, source: "none", stale: false }
  }
  if (active) {
    fetchTelemetry()
  } else {
    lastFetchTime = null
    lastSuccessfulFetch = Date.now()
    globalState = { ...globalState, online: false, stale: false, source: "none" }
    notify()
    fetchTelemetry()
  }
}

export function getDemoActive(): boolean {
  return demoActive
}

export function useRealTimeTelemetry(): RealTimeTelemetry {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((t) => t + 1)
    listeners.add(listener)
    if (listeners.size === 1) {
      startPolling()
      startWatchdog()
    }
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) {
        stopPolling()
        stopWatchdog()
      }
    }
  }, [])

  return globalState
}

export function useTelemetryHistory(): HistoryPoint[] {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((t) => t + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return history
}

export interface DashboardMetric {
  value: number
  trend: "up" | "down" | "stable"
  delta: number
}

export interface DashboardTelemetry {
  temperature: DashboardMetric
  humidity: DashboardMetric
  co2: DashboardMetric
  energyUsage: DashboardMetric
  hasRealData: boolean
}

export function useDashboardTelemetry(): DashboardTelemetry {
  const tel = useRealTimeTelemetry()
  const prevTel = useRef<RealTimeTelemetry>(tel)
  const hasData = tel.temp > 0 || tel.hum > 0

  const [metrics, setMetrics] = useState<DashboardTelemetry>({
    temperature: { value: 0, trend: "stable", delta: 0 },
    humidity: { value: 0, trend: "stable", delta: 0 },
    co2: { value: 0, trend: "stable", delta: 0 },
    energyUsage: { value: 0, trend: "stable", delta: 0 },
    hasRealData: false,
  })

  useEffect(() => {
    const prev = prevTel.current
    prevTel.current = tel

    if (prev.temp === tel.temp && prev.hum === tel.hum) return

    const tempDelta = tel.temp - prev.temp
    const humDelta = tel.hum - prev.hum

    // Only compute derived metrics when we have real data
    const co2 = hasData
      ? Math.round(400 + Math.max(0, (tel.temp - 22) * 15) + Math.max(0, (tel.hum - 55) * 2))
      : 0

    const energy = hasData
      ? Math.round((0.8 + Math.max(0, (tel.temp - 23) * 0.3) + Math.max(0, (tel.hum - 60) * 0.02)) * 10) / 10
      : 0

    setMetrics((prevMetrics) => {
      const prevCo2 = prevMetrics.co2.value
      const co2Delta = co2 - prevCo2
      const prevEnergy = prevMetrics.energyUsage.value
      const energyDelta = Math.round((energy - prevEnergy) * 10) / 10

      return {
        temperature: {
          value: tel.temp || 0,
          trend: tempDelta > 0.05 ? "up" : tempDelta < -0.05 ? "down" : "stable",
          delta: Math.round(tempDelta * 10) / 10,
        },
        humidity: {
          value: tel.hum || 0,
          trend: humDelta > 0.1 ? "up" : humDelta < -0.1 ? "down" : "stable",
          delta: Math.round(humDelta * 10) / 10,
        },
        co2: {
          value: co2,
          trend: co2Delta > 1 ? "up" : co2Delta < -1 ? "down" : "stable",
          delta: co2Delta,
        },
        energyUsage: {
          value: energy,
          trend: energyDelta > 0.05 ? "up" : energyDelta < -0.05 ? "down" : "stable",
          delta: energyDelta,
        },
        hasRealData: hasData,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tel.temp, tel.hum])

  return metrics
}

export type { HistoryPoint }
