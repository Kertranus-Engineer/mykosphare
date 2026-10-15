"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useOpEvents, type OpEventType } from "@/lib/events/bus"
import type { EnvState } from "@/lib/useEnvironment"
import { localizeAlert, localizeOpEvent, STATE_ES } from "./i18n"
import type { MobileTelemetry } from "./use-mobile-telemetry"

export type ActivitySeverity = "info" | "success" | "warning" | "critical"
export type ActivityKind = "alert" | "event" | "change"

export interface ActivityItem {
  id: string
  kind: ActivityKind
  severity: ActivitySeverity
  title: string
  detail?: string
  /** null for "active now" alerts (they describe the current condition). */
  timestamp: number | null
  /** Derived from simulated telemetry. Optional: HOME (v1) ignores it. */
  simulated?: boolean
}

interface StateChange {
  id: string
  from: EnvState
  to: EnvState
  at: number
  simulated: boolean
}

// Bus events worth surfacing. "system"/"topology"/"ai_insight" carry ambient
// chatter and duplicates of the telemetry events, so they are left out.
const BUS_TYPES: OpEventType[] = ["telemetry", "alert", "automation", "command"]

const MAX_CHANGES = 20

// The telemetry hook reports the very first connection as a "reconnection"
// (success events). Those describe app start-up, not something that happened.
const STARTUP_SETTLE_MS = 10_000

function alertSeverity(colorClass: string, label: string): ActivitySeverity {
  if (label === "Simulation Active") return "info"
  if (colorClass.includes("red")) return "critical"
  if (colorClass.includes("amber")) return "warning"
  return "info"
}

export function useMobileActivity(tel: MobileTelemetry): ActivityItem[] {
  const busEvents = useOpEvents(undefined, 100)
  const [mountedAt] = useState(() => Date.now())

  // Session-local log of environmental state transitions. It only observes the
  // state produced by the shared engine; it does not compute a state itself.
  const [changes, setChanges] = useState<StateChange[]>([])
  const prevState = useRef<EnvState | null>(null)
  const state = tel.env.state
  const ready = tel.envReady && tel.hasData
  const simulated = tel.source === "simulated"

  useEffect(() => {
    if (!ready) return
    const prev = prevState.current
    prevState.current = state
    if (prev === null || prev === state) return
    setChanges((list) =>
      [{ id: `chg-${Date.now()}-${list.length}`, from: prev, to: state, at: Date.now(), simulated }, ...list].slice(0, MAX_CHANGES),
    )
  }, [state, ready, simulated])

  return useMemo(() => {
    const items: ActivityItem[] = []

    // Active alerts. "Routine Check" is a static placeholder in the shared
    // engine ("next maintenance in 7 days"), not a real condition.
    for (const a of tel.env.alerts) {
      if (a.label === "Routine Check") continue
      const { title, detail } = localizeAlert(a.label, a.description)
      items.push({
        id: `alert-${a.label}`,
        kind: "alert",
        severity: alertSeverity(a.color, a.label),
        title,
        detail,
        timestamp: null,
        simulated: tel.source === "simulated",
      })
    }

    for (const e of busEvents) {
      if (!BUS_TYPES.includes(e.type)) continue
      if (e.severity === "info") continue // ambient chatter is always "info"
      if (e.severity === "success" && e.timestamp - mountedAt < STARTUP_SETTLE_MS) continue
      items.push({
        id: `bus-${e.id}`,
        kind: "event",
        severity: e.severity,
        title: localizeOpEvent(e.message),
        timestamp: e.timestamp,
      })
    }

    for (const c of changes) {
      const sev: ActivitySeverity =
        c.to === "CRITICAL" ? "critical"
        : c.to === "WARNING" || c.to === "ESCALATION" ? "warning"
        : c.to === "STABLE" || c.to === "RECOVERY" ? "success"
        : "info"
      items.push({
        id: c.id,
        kind: "change",
        severity: sev,
        title: `${STATE_ES[c.from].label} → ${STATE_ES[c.to].label}`,
        detail: c.simulated ? "Cambio de estado (datos simulados)" : "Cambio de estado ambiental",
        timestamp: c.at,
        simulated: c.simulated,
      })
    }

    // Active alerts first, then newest events.
    return items.sort((a, b) => {
      if (a.timestamp === null && b.timestamp !== null) return -1
      if (a.timestamp !== null && b.timestamp === null) return 1
      return (b.timestamp ?? 0) - (a.timestamp ?? 0)
    })
  }, [tel.env.alerts, tel.source, busEvents, changes, mountedAt])
}
