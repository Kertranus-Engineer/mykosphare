"use client"

import { useSyncExternalStore } from "react"

export type OpEventType = "telemetry" | "automation" | "command" | "alert" | "topology" | "ai_insight" | "system"

export interface OperationalEvent {
  id: number
  seq: string
  time: string
  type: OpEventType
  severity: "info" | "success" | "warning" | "critical"
  message: string
  timestamp: number
}

const listeners = new Set<() => void>()
let events: OperationalEvent[] = []
let eventId = 0
let seqCounter = 0
let chatterTimer: ReturnType<typeof setInterval> | null = null

function emit() {
  listeners.forEach((l) => l())
}

const AMBIENT_CHATTER = [
  { type: "system" as OpEventType, msg: "Packet integrity check passed", sev: "info" as const },
  { type: "system" as OpEventType, msg: "Relay polling cycle complete", sev: "info" as const },
  { type: "system" as OpEventType, msg: "Sync cadence verified", sev: "info" as const },
  { type: "system" as OpEventType, msg: "Node handshake confirmed", sev: "info" as const },
  { type: "system" as OpEventType, msg: "Environmental model recalibrated", sev: "info" as const },
  { type: "system" as OpEventType, msg: "Sensor mesh integrity nominal", sev: "info" as const },
  { type: "system" as OpEventType, msg: "Thermal balance assessment complete", sev: "info" as const },
  { type: "system" as OpEventType, msg: "Automation loop cycle finished", sev: "info" as const },
]

function startAmbientChatter() {
  if (chatterTimer) return
  chatterTimer = setInterval(() => {
    const chatter = AMBIENT_CHATTER[Math.floor(Math.random() * AMBIENT_CHATTER.length)]
    emitOpEvent(chatter.type, chatter.msg, chatter.sev)
  }, 4000 + Math.random() * 3000)
}

function stopAmbientChatter() {
  if (chatterTimer) {
    clearInterval(chatterTimer)
    chatterTimer = null
  }
}

export { startAmbientChatter, stopAmbientChatter }

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
}

function typeTag(type: OpEventType): string {
  switch (type) {
    case "telemetry": return "TELM"
    case "automation": return "AUTO"
    case "command": return "CMND"
    case "alert": return "ALRT"
    case "topology": return "TOPO"
    case "ai_insight": return "AI"
    case "system": return "SYST"
  }
}

export function emitOpEvent(
  type: OpEventType,
  message: string,
  severity: OperationalEvent["severity"] = "info"
) {
  const seq = `#${String(++seqCounter).padStart(4, "0")}`
  const event: OperationalEvent = {
    id: ++eventId,
    seq,
    time: nowTime(),
    type,
    severity,
    message: `[${typeTag(type)}] ${message}`,
    timestamp: Date.now(),
  }
  events = [event, ...events].slice(0, 100)
  emit()
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function getSnapshot(): OperationalEvent[] {
  return events
}

export function useOpEvents(type?: OpEventType, limit = 30): OperationalEvent[] {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  let filtered = snapshot
  if (type) {
    filtered = snapshot.filter((e) => e.type === type)
  }

  return filtered.slice(0, limit)
}

export function getEvents(type?: OpEventType, limit = 50): OperationalEvent[] {
  const filtered = type ? events.filter((e) => e.type === type) : events
  return filtered.slice(0, limit)
}
