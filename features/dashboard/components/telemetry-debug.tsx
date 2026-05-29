"use client"

import { useEffect, useState } from "react"
import { Bug, X } from "lucide-react"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"
import { cn } from "@/lib/utils"

interface DebugPayload {
  online: boolean
  stale: boolean
  lastUpdate: string | null
  serverReceivedAt: string | null
  freshnessMs: number
  telemetry: {
    temp: number
    hum: number
    fan: boolean | null
    humidifier: boolean | null
  }
  source: string
  postCount: number
  errorCount: number
  storeCreatedAt: string
  serverTime: string
  dump: {
    latest: {
      temp: number
      hum: number
      fan: boolean | null
      humidifier: boolean | null
      heartbeat: string | null
      rawTimestamp: string | null
      serverReceivedAt: string | null
    }
    postCount: number
    errorCount: number
    createdAt: string
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatAge(iso: string | null): string {
  if (!iso) return "--"
  const elapsed = Date.now() - new Date(iso).getTime()
  return formatMs(elapsed)
}

export function TelemetryDebugPanel() {
  const [open, setOpen] = useState(false)
  const [serverDebug, setServerDebug] = useState<DebugPayload | null>(null)
  const [fetchError, setFetchError] = useState("")
  const rtTel = useRealTimeTelemetry()

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch("/api/debug/telemetry")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setServerDebug(data)
          setFetchError("")
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "fetch failed")
        }
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-3 top-3 z-[9999] flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[10px] font-semibold tracking-wider text-amber-500/70 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
        title="Telemetry Debug Panel"
      >
        <Bug className="size-3" />
        DEBUG
      </button>
    )
  }

  const displayPayload = serverDebug
    ? {
        lastPacket: formatAge(serverDebug.serverReceivedAt),
        freshness: formatMs(serverDebug.freshnessMs),
        source: serverDebug.source,
        online: serverDebug.online,
        stale: serverDebug.stale,
        payload: `${serverDebug.telemetry.temp}°C / ${serverDebug.telemetry.hum}% fan=${serverDebug.telemetry.fan ? "ON" : serverDebug.telemetry.fan === false ? "OFF" : "--"} humd=${serverDebug.telemetry.humidifier ? "ON" : serverDebug.telemetry.humidifier === false ? "OFF" : "--"}`,
      }
    : null

  return (
    <div className="fixed right-3 top-3 z-[9999] w-80 rounded-lg border border-amber-500/30 bg-background/95 backdrop-blur-sm shadow-lg shadow-amber-500/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-500/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <Bug className="size-3.5 text-amber-500" />
          <span className="text-[11px] font-bold tracking-widest text-amber-500">
            LIVE DEBUG
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 px-3 py-2 font-mono text-[10px] leading-relaxed">
        {/* Client-side state */}
        <div className="mb-1 text-[9px] font-semibold tracking-wider text-muted-foreground/40 uppercase">
          Client (useTelemetry)
        </div>
        <Row label="source" value={rtTel.source} />
        <Row label="online" value={rtTel.online ? "true" : "false"} color={rtTel.online ? "text-emerald-500" : "text-red-500"} />
        <Row label="stale" value={rtTel.stale ? "true" : "false"} color={rtTel.stale ? "text-amber-500" : "text-emerald-500"} />
        <Row label="temp" value={`${rtTel.temp}°C`} />
        <Row label="hum" value={`${rtTel.hum}%`} />
        <Row label="freshness" value={formatMs(rtTel.freshnessMs)} />
        <Row label="heartbeat" value={rtTel.heartbeat ?? "--"} />

        {/* Server-side state */}
        <div className="mt-2 mb-1 text-[9px] font-semibold tracking-wider text-muted-foreground/40 uppercase">
          Server (Store)
        </div>

        {fetchError ? (
          <div className="rounded border border-red-500/20 bg-red-500/5 px-2 py-1 text-red-500">
            Error: {fetchError}
          </div>
        ) : serverDebug ? (
          <>
            <Row label="last packet" value={displayPayload!.lastPacket} />
            <Row label="freshness" value={displayPayload!.freshness} />
            <Row label="source" value={displayPayload!.source} />
            <Row label="online" value={displayPayload!.online ? "true" : "false"} color={displayPayload!.online ? "text-emerald-500" : "text-red-500"} />
            <Row label="stale" value={displayPayload!.stale ? "true" : "false"} color={displayPayload!.stale ? "text-amber-500" : "text-emerald-500"} />
            <Row label="payload" value={displayPayload!.payload} className="break-all" />
            <Row label="posts" value={String(serverDebug.postCount)} />
            <Row label="errors" value={String(serverDebug.errorCount)} />
            <Row label="server time" value={serverDebug.serverTime} />
            <Row label="store age" value={formatAge(serverDebug.storeCreatedAt)} />
            <div className="mt-1 rounded border border-amber-500/10 bg-amber-500/[0.02] px-2 py-1">
              <div className="text-[9px] font-semibold tracking-wider text-amber-500/40 mb-1 uppercase">
                Dump (globalThis)
              </div>
              <div className="text-muted-foreground/60">
                {JSON.stringify(serverDebug.dump.latest, null, 1)}
              </div>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground/40 animate-pulse">Loading...</div>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  color,
  className,
}: {
  label: string
  value: string
  color?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-muted-foreground/40 w-20 shrink-0">{label}</span>
      <span className={cn("tabular-nums truncate", color ?? "text-foreground/70")}>
        {value}
      </span>
    </div>
  )
}
