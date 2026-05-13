"use client"

import { useSyncExternalStore } from "react"
import { loadLogs, persistLogs } from "./persistence"
import { tickUptime, getDeviceSnapshot } from "./device-registry"
import { insertLog } from "@/lib/services/logs-service"
import { ingestTelemetry, ingestDeviceHeartbeatBatch } from "@/lib/ingestion"

export interface MetricSnapshot {
  value: number
  trend: "up" | "down" | "stable"
  delta: number
}

export interface TelemetrySnapshot {
  temperature: MetricSnapshot
  humidity: MetricSnapshot
  co2: MetricSnapshot
  energyUsage: MetricSnapshot
}

export interface LogEntry {
  time: string
  message: string
  type: "info" | "success"
}

const LOG_STORAGE_KEY = "operational_logs"
const MAX_LOGS = 30

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function round(v: number, decimals: number) {
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}

function computeMetric(
  current: number,
  previous: number,
  decimals: number
): MetricSnapshot {
  const value = round(current, decimals)
  const delta = round(current - previous, decimals)
  return {
    value,
    trend: delta > 0.01 ? "up" : delta < -0.01 ? "down" : "stable",
    delta,
  }
}

function computeEnvironmentalState(tel: TelemetrySnapshot): string {
  const highCo2 = tel.co2.value > 420
  const lowHum = tel.humidity.value < 59
  const highHum = tel.humidity.value > 63
  const lowTemp = tel.temperature.value < 23.8
  const highTemp = tel.temperature.value > 25.5
  const inWarning = highCo2 || lowHum || highHum || lowTemp || highTemp

  if (inWarning) {
    const recovering =
      (highCo2 && tel.co2.trend === "down") ||
      (lowHum && tel.humidity.trend === "up") ||
      (highHum && tel.humidity.trend === "down") ||
      (lowTemp && tel.temperature.trend === "up") ||
      (highTemp && tel.temperature.trend === "down")
    return recovering ? "RECOVERY" : "WARNING"
  }

  const fluctuating =
    Math.abs(tel.humidity.delta) > 0.2 ||
    Math.abs(tel.temperature.delta) > 0.08 ||
    Math.abs(tel.co2.delta) > 1

  return fluctuating ? "OPTIMIZING" : "STABLE"
}

function formatHHMM(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

const LOG_TEMPLATES = [
  "HUMIDITY NORMALIZED",
  "FAE ENABLED",
  "SENSOR STATUS STABLE",
  "CO₂ LEVELS STABILIZING",
  "AIRFLOW ADJUSTMENT COMPLETE",
  "TELEMETRY SYNC OK",
  "TEMP WITHIN RANGE",
  "LIGHT CYCLE ACTIVE",
  "AIR EXCHANGE COMPLETE",
  "MONITORING IDLE",
  "VPD WITHIN TARGET",
  "PRESSURE NOMINAL",
]

interface InternalState {
  temp: number
  hum: number
  co2: number
  energy: number
}

let raw: InternalState = {
  temp: 24.6,
  hum: 61.2,
  co2: 412,
  energy: 1.8,
}

let telemetry: TelemetrySnapshot = {
  temperature: { value: 24.6, trend: "stable", delta: 0 },
  humidity: { value: 61.2, trend: "stable", delta: 0 },
  co2: { value: 412, trend: "stable", delta: 0 },
  energyUsage: { value: 1.8, trend: "stable", delta: 0 },
}

let logs: LogEntry[] = loadLogs<LogEntry>(LOG_STORAGE_KEY, [
  { time: "22:14", message: "HUMIDITY NORMALIZED", type: "success" },
  { time: "22:15", message: "FAE ENABLED", type: "info" },
  { time: "22:17", message: "SENSOR STATUS STABLE", type: "success" },
  { time: "22:19", message: "CO₂ LEVELS STABILIZING", type: "success" },
  { time: "22:22", message: "AIRFLOW ADJUSTMENT COMPLETE", type: "info" },
  { time: "22:25", message: "TELEMETRY SYNC OK", type: "success" },
])

let currentTime = new Date()
let uptimeSeconds = 0

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1 && !intervalId) startLoop()
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((l) => l())
}

let intervalId: ReturnType<typeof setInterval> | null = null
let tickCounter = 0

function startLoop() {
  intervalId = setInterval(() => {
    const prev = raw

    raw = {
      temp: clamp(raw.temp + (Math.random() - 0.5) * 0.08, 23.5, 26.0),
      hum: clamp(raw.hum + (Math.random() - 0.5) * 0.25, 58, 65),
      co2: clamp(raw.co2 + (Math.random() - 0.5) * 1.5, 395, 430),
      energy: clamp(raw.energy + (Math.random() - 0.5) * 0.04, 1.5, 2.2),
    }

    telemetry = {
      temperature: computeMetric(raw.temp, prev.temp, 1),
      humidity: computeMetric(raw.hum, prev.hum, 1),
      co2: computeMetric(raw.co2, prev.co2, 0),
      energyUsage: computeMetric(raw.energy, prev.energy, 1),
    }

    currentTime = new Date()
    uptimeSeconds += 2.5
    tickUptime(uptimeSeconds)

    ingestTelemetry({
      version: 1,
      source: "simulator",
      timestamp: currentTime.toISOString(),
      deviceId: "MYK-SIM-001",
      deploymentId: "MYK-CH-001",
      metrics: {
        temperature: telemetry.temperature.value,
        humidity: telemetry.humidity.value,
        co2: telemetry.co2.value,
        energyUsage: telemetry.energyUsage.value,
      },
      environmentalState: computeEnvironmentalState(telemetry),
      operationalMode: "OPERATIONAL",
    })

    if (Math.random() < 0.3) {
      const msg =
        LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)]
      logs = [
        {
          time: formatHHMM(currentTime),
          message: msg,
          type: (Math.random() < 0.6 ? "success" : "info") as "success" | "info",
        },
        ...logs,
      ].slice(0, MAX_LOGS)
      persistLogs(LOG_STORAGE_KEY, logs)
      insertLog(msg, "operation")
    }

    tickCounter++
    if (tickCounter % 20 === 0) {
      const devices = getDeviceSnapshot()
      ingestDeviceHeartbeatBatch(
        devices.map((d) => ({
          version: 1,
          source: "simulator",
          timestamp: currentTime.toISOString(),
          deviceId: d.device_id,
          deviceType: d.device_type ?? "unknown",
          status: d.status ?? "online",
          health: d.health ?? 100,
          uptime: d.uptime ?? 0,
          deploymentId: "MYK-CH-001",
        }))
      )
    }

    notify()
  }, 2500)
}

export function getTelemetry(): TelemetrySnapshot {
  return telemetry
}

export function getLogs(): LogEntry[] {
  return logs
}

export function getFormattedTime(): string {
  return currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getUptimeSeconds(): number {
  return uptimeSeconds
}

export function useTelemetry(): TelemetrySnapshot {
  return useSyncExternalStore(subscribe, getTelemetry, getTelemetry)
}

export function useLogs(): LogEntry[] {
  return useSyncExternalStore(subscribe, getLogs, getLogs)
}

export function useClock(): string {
  return useSyncExternalStore(subscribe, getFormattedTime, getFormattedTime)
}

export function useUptime(): number {
  return useSyncExternalStore(subscribe, getUptimeSeconds, getUptimeSeconds)
}
