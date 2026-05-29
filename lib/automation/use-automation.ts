"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ActuatorType } from "./types"
import { evaluateAutomation, getRelayMode, setRelayMode } from "./engine"
import type { RelayMode } from "./engine"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"
import { useRealEnvironment } from "@/lib/useEnvironment"
import { emitOpEvent } from "@/lib/events/bus"
import { recordIncident, recordFanActivation, updateThermalMomentum, updateStabilizationPhase, recordAutonomousCorrection, getStabilizationPhase, computeStressIndex, recordStablePeriod, endStablePeriod } from "@/lib/operational/memory"

export type ActuatorState = "on" | "off" | "auto"
export type ActuatorMode = "manual" | "automatic"
export type FailsafeState = "normal" | "failsafe_active" | "recovering"

export interface ActuatorStatus {
  id: string
  type: ActuatorType
  label: string
  gpio: number
  state: ActuatorState
  mode: ActuatorMode
  lastCommand: string | null
  lastToggled: string | null
  justToggled: boolean
}

export interface TimelineEvent {
  time: string
  message: string
  type: "success" | "warning" | "info"
}

const DEFAULT_ACTUATORS: ActuatorStatus[] = [
  {
    id: "fan",
    type: "fan",
    label: "Ventilation Fan",
    gpio: 19,
    state: "auto",
    mode: "automatic",
    lastCommand: null,
    lastToggled: null,
    justToggled: false,
  },
  {
    id: "humidifier",
    type: "humidifier",
    label: "Humidifier",
    gpio: 17,
    state: "auto",
    mode: "automatic",
    lastCommand: null,
    lastToggled: null,
    justToggled: false,
  },
  {
    id: "heater",
    type: "heater",
    label: "Heating Element",
    gpio: 32,
    state: "off",
    mode: "manual",
    lastCommand: null,
    lastToggled: null,
    justToggled: false,
  },
]

const FAILSAFE_TIMEOUT = 10000
const FAILSAFE_COOLDOWN = 3000

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
}

async function sendCommand(command: string, mode: RelayMode): Promise<boolean> {
  try {
    const res = await fetch("/api/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, mode }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function useAutomation() {
  const rtTel = useRealTimeTelemetry()
  const env = useRealEnvironment()
  const [actuators, setActuators] = useState<ActuatorStatus[]>(DEFAULT_ACTUATORS)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [relayMode, setRelayModeState] = useState<RelayMode>(getRelayMode())
  const [failsafeState, setFailsafeState] = useState<FailsafeState>("normal")
  const prevDecisionsRef = useRef<Record<string, string>>({})
  const wasOnlineRef = useRef(false)
  const failsafeTriggeredRef = useRef(false)
  const lastOfflineRef = useRef(0)

  useEffect(() => {
    if (rtTel.online) {
      lastOfflineRef.current = 0
      if (failsafeState === "failsafe_active") {
        queueMicrotask(() => {
          setFailsafeState("recovering")
          const time = nowTime()
          const e1: TimelineEvent = { time, message: "FAILSAFE DISENGAGED", type: "success" }
          const e2: TimelineEvent = { time, message: "AUTOMATION RESTORING", type: "info" }
          setTimeline((prev) => [e1, e2, ...prev].slice(0, 30))
          setActuators((prev) =>
            prev.map((a) =>
              a.id === "heater" ? a : { ...a, state: "auto" as ActuatorState, mode: "automatic" as ActuatorMode, justToggled: false }
            )
          )
          setTimeout(() => {
            setFailsafeState("normal")
          }, 0)
        })
      }
    } else {
      if (!lastOfflineRef.current) {
        lastOfflineRef.current = Date.now()
      }
    }
  }, [rtTel.online, failsafeState])

  useEffect(() => {
    if (rtTel.online && !wasOnlineRef.current && rtTel.temp > 0) {
      emitOpEvent("system", "Telemetry recovered", "success")
      const time = nowTime()
      queueMicrotask(() => {
        const e1: TimelineEvent = { time, message: "TELEMETRY RECOVERED", type: "success" }
        const e2: TimelineEvent = { time, message: "AUTOMATION RESTORING", type: "info" }
        setTimeline((prev) => [e1, e2, ...prev].slice(0, 30))
        setActuators((prev) =>
          prev.map((a) =>
            a.id === "heater"
              ? a
              : a.mode === "automatic"
                ? { ...a, state: "auto" as ActuatorState, justToggled: false }
                : a
          )
        )
      })
    }
    wasOnlineRef.current = rtTel.online
  }, [rtTel.online, rtTel.temp])

  useEffect(() => {
    if (!rtTel.online || rtTel.temp <= 0) return

    const temp = rtTel.temp
    const hum = rtTel.hum
    const mode = relayMode

    const fanOn = actuators.find((a) => a.id === "fan")?.state === "on"
    updateThermalMomentum(temp, fanOn)

    const decisions = evaluateAutomation(temp, hum)
    if (decisions.length === 0) return

    const changed = decisions.filter((d) => {
      const prev = prevDecisionsRef.current[d.actuator]
      return prev !== d.command
    })
    if (changed.length === 0) return

    queueMicrotask(() => {
      const now = new Date().toISOString()
      const time = nowTime()

      for (const d of changed) {
        sendCommand(d.command!, mode)

        setActuators((prevList) =>
          prevList.map((a) => {
            if (a.id !== d.actuator || a.mode !== "automatic") return a
            const newState = d.command!.includes("_on") ? "on" : "off"
            return { ...a, state: newState as ActuatorState, lastCommand: d.command!, lastToggled: now, justToggled: true }
          })
        )

        if (d.reason) {
          const eventType: TimelineEvent["type"] =
            d.command!.includes("_on") ? "success" : "info"
          setTimeline((prev) =>
            [
              { time, message: d.reason!, type: eventType },
              ...prev,
            ].slice(0, 30)
          )
        }

        if (d.reason) {
          emitOpEvent("automation", d.reason, d.command!.includes("_on") ? "success" : "info")
          if (d.command === "fan_on" && d.reason.includes("EMERGENCY")) {
            recordIncident(temp, true)
          }
          if (d.command === "fan_on") {
            recordFanActivation()
          }
        }

        prevDecisionsRef.current[d.actuator] = d.command!
      }

      setTimeout(() => {
        setActuators((prev) => prev.map((a) => ({ ...a, justToggled: false })))
      }, 2000)
    })
  }, [rtTel.temp, rtTel.hum, rtTel.online, relayMode, failsafeState])

  useEffect(() => {
    const id = setInterval(() => {
      if (!rtTel.online && lastOfflineRef.current > 0) {
        const offlineDuration = Date.now() - lastOfflineRef.current
        if (offlineDuration > FAILSAFE_TIMEOUT && !failsafeTriggeredRef.current) {
          failsafeTriggeredRef.current = true
          emitOpEvent("automation", "FAILSAFE ACTIVE: All actuators emergency off", "critical")
          recordIncident(rtTel.temp, true)
          setFailsafeState("failsafe_active")
          const time = nowTime()
          const e1: TimelineEvent = { time, message: "FAILSAFE ACTIVE: TELEMETRY LOST", type: "warning" }
          const e2: TimelineEvent = { time, message: "ALL ACTUATORS EMERGENCY OFF", type: "warning" }
          setTimeline((prev) => [e1, e2, ...prev].slice(0, 30))
          sendCommand("all_off", relayMode)
          setActuators((prev) =>
            prev.map((a) => ({
              ...a,
              state: "off" as ActuatorState,
              mode: a.id === "heater" ? "manual" as ActuatorMode : "automatic" as ActuatorMode,
              justToggled: false,
            }))
          )
        }
      } else if (rtTel.online) {
        failsafeTriggeredRef.current = false
        lastOfflineRef.current = 0
      }
    }, FAILSAFE_COOLDOWN)
    return () => clearInterval(id)
  }, [rtTel.online, relayMode])

  const toggleRelayMode = useCallback(() => {
    const next: RelayMode = relayMode === "active_high" ? "active_low" : "active_high"
    setRelayMode(next)
    setRelayModeState(next)
    const time = nowTime()
    const evt: TimelineEvent = { time, message: `RELAY MODE: ${next === "active_high" ? "ACTIVE HIGH" : "ACTIVE LOW"}`, type: "info" }
    setTimeline((prev) => [evt, ...prev].slice(0, 30))
  }, [relayMode])

  const toggleManual = useCallback(async (actuatorId: string, action: "on" | "off") => {
    const command = `${actuatorId}_${action}`
    const ok = await sendCommand(command, relayMode)
    if (!ok) return

    const now = new Date().toISOString()
    const time = nowTime()
    const gpio = DEFAULT_ACTUATORS.find((a) => a.id === actuatorId)?.gpio ?? 0
    const isFan = actuatorId === "fan"
    const isHeater = actuatorId === "heater"
    const isHumidifier = actuatorId === "humidifier"

    setActuators((prev) =>
      prev.map((a) =>
        a.id === actuatorId
          ? { ...a, state: action, mode: "manual", lastCommand: command, lastToggled: now, justToggled: true }
          : a
      )
    )
    setTimeline((prev) => {
      const msg = isFan && action === "on"
        ? "FAN SYSTEM ACTIVATED"
        : isFan && action === "off"
          ? "FAN SYSTEM DEACTIVATED"
          : isHeater && action === "on"
            ? "HEATER ACTIVE"
            : isHumidifier && action === "on"
              ? "HUMIDIFIER ACTIVATED"
              : `${actuatorId.toUpperCase()} ${action === "on" ? "ON" : "OFF"}`
      const event: TimelineEvent = {
        time,
        message: `${msg} (GPIO${gpio} ${action === "on" ? "HIGH" : "LOW"})`,
        type: action === "on" ? "success" : "info",
      }
      return [event, ...prev].slice(0, 30)
    })
    setTimeout(() => {
      setActuators((prev) => prev.map((a) => ({ ...a, justToggled: false })))
    }, 2000)
  }, [relayMode])

  const setAutoMode = useCallback((actuatorId: string) => {
    setActuators((prev) =>
      prev.map((a) =>
        a.id === actuatorId
          ? { ...a, mode: "automatic", state: "auto", justToggled: false }
          : a
      )
    )
  }, [])

  const allOff = useCallback(async () => {
    const ok = await sendCommand("all_off", relayMode)
    if (!ok) return

    const now = new Date().toISOString()
    const time = nowTime()
    setActuators((prev) =>
      prev.map((a) => ({ ...a, state: "off" as ActuatorState, mode: "manual" as ActuatorMode, lastCommand: `${a.id}_off`, lastToggled: now, justToggled: false }))
    )
    const evt: TimelineEvent = { time, message: "ALL ACTUATORS OFF (GPIO ALL LOW)", type: "warning" }
    setTimeline((prev) => [evt, ...prev].slice(0, 30))
  }, [relayMode])

  const isAnyActive = actuators.some((a) => a.state === "on")
  const automationActive = actuators.every((a) => a.id === "heater" || a.mode === "automatic")

  useEffect(() => {
    updateStabilizationPhase(env.state, computeStressIndex())
  }, [env.state])

  useEffect(() => {
    if (env.state === "STABLE" && rtTel.online) {
      recordStablePeriod()
    } else {
      endStablePeriod()
    }
  }, [env.state, rtTel.online])

  useEffect(() => {
    updateStabilizationPhase(env.state, computeStressIndex())
  }, [env.state])

  const prevPhaseRef = useRef(getStabilizationPhase())
  useEffect(() => {
    const phase = getStabilizationPhase()
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase

    if (prev !== phase && phase === "reconstruction") {
      recordAutonomousCorrection()
      emitOpEvent("system", "Autonomous stabilization active — environmental equilibrium restoring", "success")
    }
    if (prev !== phase && phase === "nominal" && prev !== "domant") {
      emitOpEvent("system", "Nominal operation restored — autonomous recovery complete", "success")
    }
  })

  return {
    actuators,
    timeline,
    relayMode,
    failsafeState,
    toggleRelayMode,
    toggleManual,
    setAutoMode,
    allOff,
    isAnyActive,
    automationActive,
  }
}
