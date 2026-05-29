"use client"

import { useEffect, useRef, useState } from "react"
import { ScrollText } from "lucide-react"

import { useRealTimeTelemetry } from "@/lib/useTelemetry"
import type { RealTimeTelemetry } from "@/lib/useTelemetry"
import { useRealEnvironment } from "@/lib/useEnvironment"
import type { EnvState } from "@/lib/useEnvironment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface LogLine {
  time: string
  message: string
  type: "info" | "success" | "warning" | "critical"
}

const MAX_LOGS = 14

function LogDot({ type }: { type: "info" | "success" | "warning" | "critical" }) {
  return (
    <div
      className={cn(
        "mt-1.5 size-1.5 shrink-0 rounded-full",
        type === "critical"
          ? "bg-red-500 shadow-[0_0_6px_1px] shadow-red-500/40 animate-pulse"
          : type === "success"
            ? "bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-500/30"
            : type === "warning"
              ? "bg-amber-500 shadow-[0_0_6px_1px] shadow-amber-500/30"
              : "bg-muted-foreground/40"
      )}
    />
  )
}

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
}

function generateLogs(
  tel: RealTimeTelemetry,
  prevTel: RealTimeTelemetry,
  envState: EnvState,
  prevEnvState: EnvState
): LogLine[] {
  const logs: LogLine[] = []

  if (tel.online && !prevTel.online) {
    logs.push({ time: nowTime(), message: "ESP32 CONNECTED", type: "success" })
    logs.push({ time: nowTime(), message: "TELEMETRY RECOVERED", type: "success" })
  }
  if (!tel.online && prevTel.online) {
    logs.push({ time: nowTime(), message: "TELEMETRY STREAM LOST", type: "critical" })
    logs.push({ time: nowTime(), message: "SENSOR OFFLINE", type: "critical" })
  }

  if (!tel.online) return logs

  if (tel.temp > 0 && prevTel.temp === 0) {
    logs.push({ time: nowTime(), message: "INITIAL TELEMETRY RECEIVED", type: "success" })
    logs.push({ time: nowTime(), message: "MONITORING ACTIVE", type: "info" })
  }

  const tempDelta = tel.temp - prevTel.temp
  if (Math.abs(tempDelta) >= 0.2 && prevTel.temp > 0) {
    if (tempDelta > 0) {
      logs.push({
        time: nowTime(),
        message: `TEMPERATURE RISING: ${tel.temp}\u00b0C`,
        type: tel.temp > 32 ? "critical" : tel.temp > 28 ? "warning" : "info",
      })
    } else {
      logs.push({
        time: nowTime(),
        message: `TEMPERATURE DROP DETECTED: ${tel.temp}\u00b0C`,
        type: "info",
      })
    }
  }

  const humDelta = tel.hum - prevTel.hum
  if (Math.abs(humDelta) >= 0.3 && prevTel.hum > 0) {
    if (humDelta < 0) {
      logs.push({
        time: nowTime(),
        message: `HUMIDITY DROP DETECTED: ${tel.hum}%`,
        type: tel.hum < 50 ? "warning" : "info",
      })
    } else {
      logs.push({
        time: nowTime(),
        message: `HUMIDITY RECOVERING: ${tel.hum}%`,
        type: "info",
      })
    }
  }

  if (envState !== prevEnvState) {
    if (envState === "CRITICAL") {
      logs.push({ time: nowTime(), message: "CRITICAL: ENVIRONMENTAL INSTABILITY", type: "critical" })
    } else if (envState === "WARNING" && prevEnvState !== "CRITICAL") {
      logs.push({ time: nowTime(), message: "WARNING: OPERATIONAL DEVIATION DETECTED", type: "warning" })
    } else if (envState === "RECOVERY") {
      logs.push({ time: nowTime(), message: "CONDITIONS STABILIZING", type: "success" })
    } else if (envState === "STABLE") {
      logs.push({ time: nowTime(), message: "CONDITIONS STABILIZED", type: "success" })
    } else if (envState === "OPTIMIZING") {
      logs.push({ time: nowTime(), message: "FAN SYSTEM ACTIVATED", type: "info" })
    }
  }

  if (tel.temp > 28 && prevTel.temp <= 28) {
    logs.push({ time: nowTime(), message: "HIGH TEMPERATURE ALERT", type: "warning" })
  }
  if (tel.temp > 32 && prevTel.temp <= 32) {
    logs.push({ time: nowTime(), message: "CRITICAL TEMPERATURE THRESHOLD", type: "critical" })
  }
  if (tel.hum < 50 && prevTel.hum >= 50) {
    logs.push({ time: nowTime(), message: "LOW HUMIDITY ALERT", type: "warning" })
  }

  return logs
}

export function SystemLogs() {
  const rtTel = useRealTimeTelemetry()
  const env = useRealEnvironment()
  const [logs, setLogs] = useState<LogLine[]>([])
  const prevTelRef = useRef<RealTimeTelemetry>({ temp: 0, hum: 0, fan: null, humidifier: null, online: false, degraded: false, updatedAt: null, heartbeat: null, serverReceivedAt: null, freshnessMs: 0, stale: false, source: "none" })
  const prevEnvRef = useRef<EnvState>("STABLE")

  useEffect(() => {
    const prev = prevTelRef.current
    const prevEnv = prevEnvRef.current
    const newLogs = generateLogs(rtTel, prev, env.state, prevEnv)
    prevTelRef.current = rtTel
    prevEnvRef.current = env.state

    setLogs((prevLogs) => {
      if (newLogs.length === 0 && prevLogs.length === 0 && rtTel.online) {
        return [{ time: nowTime(), message: "AWAITING TELEMETRY DATA", type: "info" }]
      }
      const merged = [...newLogs, ...prevLogs].slice(0, MAX_LOGS)
      return merged
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rtTel.temp, rtTel.hum, rtTel.online, env.state])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-4 text-muted-foreground" />
          Operational Timeline
          <span className="ml-auto">
            <span className={cn(
              "text-[10px] font-medium transition-all duration-300",
              rtTel.online ? "text-emerald-500" : "text-muted-foreground/40"
            )}>
              {rtTel.online ? "ESP32 ONLINE" : "DEVICE OFFLINE"}
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {logs.length === 0 ? (
            <div className="rounded px-1 py-1.5 text-xs text-muted-foreground/40">
              Awaiting telemetry data...
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 rounded px-1 py-1.5">
                <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">
                  {log.time}
                </span>
                <LogDot type={log.type} />
                <span className="text-xs text-foreground/80">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
