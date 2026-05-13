"use client"

import { useMemo } from "react"
import { useRealtimeTelemetry } from "@/lib/realtime/subscriptions"
import type { TelemetryRow } from "@/lib/services/telemetry-service"
import { useTelemetry } from "@/mock/simulator"

export interface TelemetryHistory {
  rows: TelemetryRow[]
  connected: boolean
  latency: number | null
  rollingAverages: {
    temperature: number
    humidity: number
    co2: number
    energy: number
  }
  trends: {
    temperature: "rising" | "falling" | "stable"
    humidity: "rising" | "falling" | "stable"
    co2: "rising" | "falling" | "stable"
  }
  stability: number
  variance: {
    temperature: number
    humidity: number
    co2: number
  }
  recentHistory: { time: string; temperature: number; humidity: number; co2: number; energy: number }[]
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stddev(nums: number[], mean: number): number {
  if (nums.length < 2) return 0
  const sqDiffs = nums.map((n) => (n - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (nums.length - 1))
}

function calcTrend(values: number[]): "rising" | "falling" | "stable" {
  if (values.length < 3) return "stable"
  const first = average(values.slice(0, Math.ceil(values.length / 3)))
  const last = average(values.slice(-Math.ceil(values.length / 3)))
  const diff = last - first
  if (diff > 0.1) return "rising"
  if (diff < -0.1) return "falling"
  return "stable"
}

export function useTelemetryHistory() {
  const { data: rtData, status, latency } = useRealtimeTelemetry(200)
  const liveTelemetry = useTelemetry()
  const connected = status === "live"

  return useMemo(() => {
    const rows = rtData

    const recentHistory = rows.slice(0, 48).reverse().map((r) => ({
      time: r.created_at
        ? new Date(r.created_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--",
      temperature: r.temperature ?? liveTelemetry.temperature.value,
      humidity: r.humidity ?? liveTelemetry.humidity.value,
      co2: r.co2 ?? liveTelemetry.co2.value,
      energy: r.energy_usage ?? liveTelemetry.energyUsage.value,
    }))

    const temps = rows.map((r) => r.temperature).filter((t): t is number => t !== null)
    const hums = rows.map((r) => r.humidity).filter((h): h is number => h !== null)
    const co2s = rows.map((r) => r.co2).filter((c): c is number => c !== null)
    const energies = rows.map((r) => r.energy_usage).filter((e): e is number => e !== null)

    if (temps.length === 0) {
      temps.push(liveTelemetry.temperature.value)
      hums.push(liveTelemetry.humidity.value)
      co2s.push(liveTelemetry.co2.value)
      energies.push(liveTelemetry.energyUsage.value)
    }

    const rollingAverages = {
      temperature: Math.round(average(temps) * 10) / 10,
      humidity: Math.round(average(hums) * 10) / 10,
      co2: Math.round(average(co2s)),
      energy: Math.round(average(energies) * 100) / 100,
    }

    const trends = {
      temperature: calcTrend(temps),
      humidity: calcTrend(hums),
      co2: calcTrend(co2s),
    }

    const stabilityStates = rows
      .map((r) => r.environmental_state)
      .filter((s): s is string => s !== null)
    const stableCount = stabilityStates.filter((s) => s === "STABLE").length
    const stability = stabilityStates.length > 0
      ? Math.round((stableCount / stabilityStates.length) * 100)
      : 100

    const variance = {
      temperature: Math.round(stddev(temps, rollingAverages.temperature) * 10) / 10,
      humidity: Math.round(stddev(hums, rollingAverages.humidity) * 10) / 10,
      co2: Math.round(stddev(co2s, rollingAverages.co2)),
    }

    return {
      rows,
      connected,
      latency,
      rollingAverages,
      trends,
      stability,
      variance,
      recentHistory,
    }
  }, [rtData, latency, liveTelemetry, connected])
}
