"use client"

import { X, Activity, Clock, Heart, AlertTriangle, TrendingUp, TrendingDown, Minus, Gauge, Siren, Wrench, Thermometer, Droplets, Wind } from "lucide-react"
import { useState, useEffect } from "react"
import type { TopologyNode } from "@/lib/topology/types"
import type { AugmentedNode } from "@/lib/unified/types"
import { getStatusVisual } from "@/lib/topology/status"
import { getNodeTypeMeta } from "@/lib/topology/node-types"
import { cn } from "@/lib/utils"

function useTimeAgo(ts: string | null): string {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  if (!hydrated || !ts) return "—"
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 1000) return "just now"
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

const ALERT_META: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red-500", bg: "bg-red-500/10" },
  warning: { color: "text-amber-500", bg: "bg-amber-500/10" },
  info: { color: "text-blue-500", bg: "bg-blue-500/10" },
}

const STATUS_META: Record<string, { color: string }> = {
  optimal: { color: "text-emerald-500" },
  stable: { color: "text-blue-500" },
  degraded: { color: "text-amber-500" },
  unstable: { color: "text-orange-500" },
  critical: { color: "text-red-500" },
}

function DriftIcon({ direction }: { direction: string }) {
  if (direction === "rising") return <TrendingUp className="size-3 text-amber-500" />
  if (direction === "falling") return <TrendingDown className="size-3 text-red-500" />
  if (direction === "volatile") return <Activity className="size-3 text-orange-500" />
  return <Minus className="size-3 text-blue-500" />
}

export function NodeCard({
  node,
  augmented,
  onClose,
  temp,
  hum,
  co2,
}: {
  node: TopologyNode
  augmented?: AugmentedNode | null
  onClose: () => void
  temp?: number
  hum?: number
  co2?: number
}) {
  const vis = getStatusVisual(node.status)
  const alertMeta = augmented?.alertSeverity ? ALERT_META[augmented.alertSeverity] : null
  const combinedMeta = augmented ? STATUS_META[augmented.combinedStatus] : null
  const nodeMeta = getNodeTypeMeta(node.nodeType)
  const hbAgo = useTimeAgo(node.lastHeartbeat)
  const telAgo = useTimeAgo(node.lastTelemetry)

  return (
    <div className="absolute bottom-3 left-3 z-40 w-80 rounded-xl border border-border/60 bg-card p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("size-2.5 rounded-full ring-1 ring-offset-1 ring-offset-card", vis.dotColor, vis.glowColor, vis.animClass)} />
          <div>
            <span className="text-sm font-semibold text-foreground block leading-tight">{node.label}</span>
            <span className="text-[10px] text-muted-foreground/50">{nodeMeta.label} · {node.id}</span>
          </div>
          {augmented?.activeAlertCount ? (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", alertMeta?.bg, alertMeta?.color)}>
              {augmented.activeAlertCount}
            </span>
          ) : null}
        </div>
        <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition-colors">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5">
          <span className="text-muted-foreground/70">Status</span>
          <span className={cn("font-semibold", vis.color)}>{vis.label}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5">
          <span className="text-muted-foreground/70">Type</span>
          <span className="font-medium text-foreground">{nodeMeta.description}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-md bg-muted/30 px-2 py-1.5">
            <span className="text-[9px] text-muted-foreground/60 block">Health</span>
            <span className="font-semibold tabular-nums text-foreground">{node.health}%</span>
          </div>
          <div className="rounded-md bg-muted/30 px-2 py-1.5">
            <span className="text-[9px] text-muted-foreground/60 block">Telemetry</span>
            <span className="font-semibold tabular-nums text-foreground">{node.telemetryQuality}%</span>
          </div>
        </div>
        <div className="rounded-md bg-muted/30 px-2 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/60">Uptime</span>
          <span className="font-semibold tabular-nums text-foreground">{node.uptime}s</span>
        </div>
        <div className="rounded-md bg-muted/30 px-2 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/60">Sync State</span>
          <span className="font-semibold tabular-nums text-foreground">{node.syncState ?? "—"}</span>
        </div>
        {node.nodeType === "chamber" && temp !== undefined && (
          <div className="rounded-md bg-muted/20 px-2 py-1.5">
            <span className="text-[9px] text-muted-foreground/50 block mb-1">Environmental Readings</span>
            <div className="grid grid-cols-3 gap-1">
              <div className="rounded bg-muted/30 px-1.5 py-1">
                <span className="text-[8px] text-muted-foreground/50 block">Temp</span>
                <span className="text-xs font-bold tabular-nums text-emerald-500">{temp > 0 ? `${temp.toFixed(1)}°C` : "--"}</span>
              </div>
              <div className="rounded bg-muted/30 px-1.5 py-1">
                <span className="text-[8px] text-muted-foreground/50 block">Humidity</span>
                <span className="text-xs font-bold tabular-nums text-blue-500">{hum !== undefined && hum > 0 ? `${hum.toFixed(1)}%` : "--"}</span>
              </div>
              <div className="rounded bg-muted/30 px-1.5 py-1">
                <span className="text-[8px] text-muted-foreground/50 block">CO2</span>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">{co2 !== undefined && co2 > 0 ? `${co2}` : "--"}<span className="text-[8px] font-normal">ppm</span></span>
              </div>
            </div>
          </div>
        )}
        {node.nodeType === "esp32" && (
          <div className="rounded-md bg-muted/20 px-2 py-1.5">
            <span className="text-[9px] text-muted-foreground/50 block mb-1">Gateway Status</span>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60">Connected Sensors</span>
              <span className="text-xs font-bold tabular-nums text-blue-500">3</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-muted-foreground/60">Latency</span>
              <span className="text-xs font-bold tabular-nums text-cyan-500">{node.responseLatency ?? 8}ms</span>
            </div>
          </div>
        )}
        {(node.nodeType === "relay" || node.nodeType === "relay-controller" || node.nodeType === "ventilation-controller" || node.nodeType === "humidity-actuator") && (
          <div className="rounded-md bg-muted/20 px-2 py-1.5">
            <span className="text-[9px] text-muted-foreground/50 block mb-1">Actuator Status</span>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60">Mode</span>
              <span className="text-xs font-bold tabular-nums text-foreground">Auto</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-muted-foreground/60">Power</span>
              <span className="text-xs font-bold tabular-nums text-amber-500">12W</span>
            </div>
          </div>
        )}
        <div className="rounded-md bg-muted/30 px-2 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/60">Packet Integrity</span>
          <span className="font-semibold tabular-nums text-foreground">{node.packetIntegrity ?? "—"}%</span>
        </div>
        <div className="rounded-md bg-muted/30 px-2 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/60">Telemetry Load</span>
          <span className="font-semibold tabular-nums text-foreground">{node.telemetryLoad ?? "—"}</span>
        </div>
        <div className="rounded-md bg-muted/30 px-2 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/60">Response Latency</span>
          <span className="font-semibold tabular-nums text-foreground">{node.responseLatency ?? "—"}ms</span>
        </div>
      </div>

      {augmented && (
        <div className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
          <div className="flex items-center justify-between rounded-md bg-muted/20 px-2 py-1">
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <Gauge className="size-2.5" />
              Combined Status
            </span>
            <span className={cn("text-[11px] font-semibold tabular-nums capitalize", combinedMeta?.color)}>
              {augmented.combinedStatus} ({Math.round(
                (augmented.healthScore + augmented.telemetryQuality + augmented.reliabilityScore) / 3
              )})
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/20 px-2 py-1">
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <Activity className="size-2.5" />
              Drift
            </span>
            <span className="flex items-center gap-1 text-[11px] tabular-nums text-foreground">
              <DriftIcon direction={augmented.driftDirection} />
              {augmented.driftMagnitude}
            </span>
          </div>
          {augmented.alertSeverity && (
            <div className={cn("rounded-md border px-2 py-1 flex items-center gap-1.5", alertMeta?.bg.replace("bg-", "border-").replace("/10", "/20"), alertMeta?.bg)}>
              <AlertTriangle className={cn("size-3", alertMeta?.color)} />
              <span className={cn("text-[10px] font-medium", alertMeta?.color)}>
                {augmented.activeAlertCount} active alert{augmented.activeAlertCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {augmented.incidentCount > 0 && (
            <div className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-1 flex items-center gap-1.5">
              <Siren className="size-3 text-violet-500" />
              <span className="text-[10px] font-medium text-violet-500">
                {augmented.incidentCount} active incident{augmented.incidentCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {augmented.maintenanceCount > 0 && (
            <div className="rounded-md border border-orange-500/20 bg-orange-500/10 px-2 py-1 flex items-center gap-1.5">
              <Wrench className="size-3 text-orange-500" />
              <span className="text-[10px] font-medium text-orange-500">
                {augmented.maintenanceCount} maintenance task{augmented.maintenanceCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {node.capabilities.length > 0 && (
        <div className="mt-2">
          <span className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider">Capabilities</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {node.capabilities.map((cap) => (
              <span
                key={cap.label}
                className="rounded-md border border-border/40 bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground/70"
              >
                {cap.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground/50">
        <span className="flex items-center gap-1">
          <Heart className="size-3" />
          {node.uptime}s
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          HB: {hbAgo}
        </span>
        <span className="flex items-center gap-1">
          <Activity className="size-3" />
          {telAgo}
        </span>
      </div>
    </div>
  )
}
