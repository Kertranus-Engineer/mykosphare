"use client"

import { useMemo } from "react"
import { useRealTimeTelemetry, useDashboardTelemetry } from "@/lib/useTelemetry"
import { useRealEnvironment } from "@/lib/useEnvironment"

export interface EnvironmentalHealth {
  score: number
  label: string
  color: string
  tempStability: number
  humStability: number
  telemetryIntegrity: number
  networkCoherence: number
}

export function useEnvironmentalHealth(): EnvironmentalHealth {
  const rtTel = useRealTimeTelemetry()
  const tel = useDashboardTelemetry()
  const env = useRealEnvironment()

  return useMemo(() => {
    const temp = tel.temperature.value
    const hum = tel.humidity.value

    // Temperature stability: 100 when 22-26°C, drops outside
    let tempStability = 100
    if (temp > 32) tempStability = 10
    else if (temp > 28) tempStability = 30
    else if (temp > 26) tempStability = 65
    else if (temp < 15) tempStability = 20
    else if (temp < 18) tempStability = 50
    else if (temp < 22) tempStability = 80
    if (temp <= 0) tempStability = 0

    // Humidity stability: 100 when 55-65%, drops outside
    let humStability = 100
    if (hum > 85) humStability = 10
    else if (hum > 75) humStability = 30
    else if (hum > 65) humStability = 70
    else if (hum < 30) humStability = 10
    else if (hum < 40) humStability = 30
    else if (hum < 50) humStability = 60
    else if (hum < 55) humStability = 80
    if (hum <= 0) humStability = 0

    // Telemetry integrity: based on freshness and online status
    let telemetryIntegrity = 100
    if (!rtTel.online) telemetryIntegrity = 0
    else if (rtTel.stale) telemetryIntegrity = 25
    else if (rtTel.degraded) telemetryIntegrity = 50
    else if (rtTel.freshnessMs > 8000) telemetryIntegrity = 65
    else if (rtTel.freshnessMs > 4000) telemetryIntegrity = 85

    // Network coherence: derived from telemetry integrity + state
    let networkCoherence = telemetryIntegrity
    if (env.state === "CRITICAL") networkCoherence = Math.min(networkCoherence, 30)
    else if (env.state === "WARNING") networkCoherence = Math.min(networkCoherence, 55)
    else if (env.state === "RECOVERY") networkCoherence = Math.min(networkCoherence, 75)

    // Weighted score
    const score = Math.round(
      tempStability * 0.3 + humStability * 0.25 + telemetryIntegrity * 0.25 + networkCoherence * 0.2
    )

    let label: string
    let color: string
    if (score >= 90) { label = "OPTIMAL"; color = "text-emerald-500" }
    else if (score >= 70) { label = "STABLE"; color = "text-emerald-500/80" }
    else if (score >= 50) { label = "DEGRADED"; color = "text-amber-500" }
    else if (score >= 25) { label = "UNSTABLE"; color = "text-orange-500" }
    else { label = "CRITICAL"; color = "text-red-500" }

    return { score, label, color, tempStability, humStability, telemetryIntegrity, networkCoherence }
  }, [tel.temperature.value, tel.humidity.value, rtTel.online, rtTel.stale, rtTel.degraded, rtTel.freshnessMs, env.state])
}
