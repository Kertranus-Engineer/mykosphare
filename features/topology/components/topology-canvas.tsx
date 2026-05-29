"use client"

import { useState, useSyncExternalStore, useMemo, memo, useEffect } from "react"
import { Wifi, WifiOff, AlertTriangle, Shield, Brain, Siren, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUnifiedOperationalState } from "@/lib/unified/use-unified"
import { ScenarioBanner } from "@/features/scenario/components/scenario-banner"
import { getStatusVisual } from "@/lib/topology/status"
import { getNodeRadius } from "@/lib/topology/graph"
import type { TopologyNode, ZoneLabel } from "@/lib/topology/types"
import type { AugmentedNode } from "@/lib/unified/types"
import { SignalLink } from "./signal-link"
import { NodeCard } from "./node-card"
import { TopologyMetrics } from "./topology-metrics"

const NODE_ICONS: Record<string, string> = {
  chamber: "\u2B21",
  esp32: "\u25C6",
  sensor: "\u25CF",
  relay: "\u25A3",
  camera: "\u25C8",
  power: "\u26A1",
  cloud: "\u2601",
  simulator: "\u2318",
  "sensor-mesh": "\u25C9",
  "co2-sensor": "\u2603",
  "temp-sensor": "\u2103",
  "humidity-sensor": "\u2601",
  "airflow-sensor": "\u2248",
  "relay-controller": "\u25D0",
  "ventilation-controller": "\u2726",
  "humidity-actuator": "\u2730",
  "thermal-regulator": "\u2668",
  "ai-inference": "\u262F",
  predictive: "\u2191",
  broker: "\u21C4",
  correlator: "\u2295",
  "edge-compute": "\u25C7",
  archive: "\u2666",
  failover: "\u26E8",
  recovery: "\u21BB",
  "remote-sync": "\u21D5",
  analytics: "\u2622",
}

const COMBINED_GLOW: Record<string, string> = {
  optimal: "drop-[0_0_4px_rgba(16,185,129,0.4)]",
  stable: "drop-[0_0_4px_rgba(59,130,246,0.3)]",
  degraded: "drop-[0_0_4px_rgba(245,158,11,0.3)]",
  unstable: "drop-[0_0_4px_rgba(249,115,22,0.4)]",
  critical: "drop-[0_0_4px_rgba(239,68,68,0.5)]",
}

let animationTime = Date.now()
let rafId = 0
const timeListeners = new Set<() => void>()

function startTimeLoop() {
  if (rafId) return
  function tick() {
    animationTime = Date.now()
    timeListeners.forEach((l) => l())
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function useAnimationTime(): number {
  return useSyncExternalStore(
    (cb) => {
      timeListeners.add(cb)
      startTimeLoop()
      return () => { timeListeners.delete(cb) }
    },
    () => animationTime,
    () => animationTime
  )
}

const BG_GRID = memo(function _BgGrid({ w, h }: { w: number; h: number }) {
  const step = 50
  const countX = Math.ceil(w / step)
  const countY = Math.ceil(h / step)
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 1; i < countX; i++) {
    const x = i * step
    lines.push({ x1: x, y1: 0, x2: x, y2: h })
  }
  for (let i = 1; i < countY; i++) {
    const y = i * step
    lines.push({ x1: 0, y1: y, x2: w, y2: y })
  }
  return (
    <g>
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="stroke-foreground/3" strokeWidth={0.5} />
      ))}
    </g>
  )
})

const ZoneLabelOverlay = memo(function _ZoneLabelOverlay({ zones }: { zones: ZoneLabel[] }) {
  return (
    <g>
      {zones.map((zone) => (
        <text
          key={zone.id}
          x={zone.x + zone.width / 2}
          y={zone.y}
          textAnchor="middle"
          className="fill-muted-foreground/20 text-[9px] font-semibold tracking-[0.2em] uppercase select-none"
        >
          {zone.label}
        </text>
      ))}
    </g>
  )
})

const TopologyNodeDot = memo(function _TopologyNodeDot({
  node, augmented, isInspected, onInspect, time, mounted,
}: {
  node: TopologyNode; augmented?: AugmentedNode | null; isInspected: boolean
  onInspect: (node: TopologyNode) => void; time: number; mounted: boolean
}) {
  const vis = getStatusVisual(node.status)
  const radius = getNodeRadius(node.nodeType)
  const isChamber = node.nodeType === "chamber"
  const combinedGlow = augmented ? COMBINED_GLOW[augmented.combinedStatus] ?? "" : ""
  const hasAlerts = augmented && augmented.activeAlertCount > 0
  const hasIncidents = augmented && augmented.incidentCount > 0
  const hasMaintenance = augmented && augmented.maintenanceCount > 0
  const isCritical = augmented?.combinedStatus === "critical" || augmented?.combinedStatus === "unstable"
  const isOnline = node.status === "online"
  const isOffline = node.status === "offline"
  const isWarning = node.status === "warning"
  const isSyncing = node.status === "syncing"

  const seed = node.id.charCodeAt(0) + node.id.charCodeAt(1) * 256
  const breathPhase = mounted ? Math.sin(time / 2000 + seed * 0.01) * 0.5 + 0.5 : 0.5
  const jitterX = mounted && isOffline ? Math.sin(time / 300 + seed * 0.02) * 1.5 : 0
  const jitterY = mounted && isOffline ? Math.cos(time / 350 + seed * 0.03) * 1.5 : 0
  const reconnectRipple = mounted && isSyncing ? (time % 3000) / 3000 : 0

  return (
    <g
      onClick={() => onInspect(node)}
      className="cursor-pointer"
      style={{ transform: `translate(${jitterX}px, ${jitterY}px)` }}
      transform={`translate(${node.x}, ${node.y})`}
    >
      {/* Chamber pulse rings */}
      {isChamber && isOnline && (
        <>
          <circle
            r={radius + 16 + breathPhase * 6} fill="none"
            stroke="hsl(142 70% 45%)" strokeWidth={0.5}
            opacity={0.06 + breathPhase * 0.04}
          />
          <circle
            r={radius + 28 + breathPhase * 8} fill="none"
            stroke="hsl(142 70% 40%)" strokeWidth={0.3}
            opacity={0.03 + breathPhase * 0.03}
          />
        </>
      )}

      {/* Online breathing aura */}
      {isOnline && !isChamber && (
        <circle
          r={radius + 6 + breathPhase * 3} fill="none"
          stroke="hsl(142 70% 50%)" strokeWidth={0.5}
          opacity={0.08 + breathPhase * 0.04}
        />
      )}

      {/* Syncing ripple */}
      {isSyncing && reconnectRipple > 0 && reconnectRipple < 1 && (
        <circle
          r={radius + 4 + reconnectRipple * 20} fill="none"
          stroke="hsl(217 91% 60%)" strokeWidth={1.5 - reconnectRipple}
          opacity={0.4 * (1 - reconnectRipple)}
        />
      )}

      {/* Outer border */}
      <circle
        r={radius + (isInspected ? 4 : 0) + (isCritical ? 2 : 0) + (isChamber ? 2 : 0)}
        fill={isInspected ? "hsl(var(--muted))" : "hsl(var(--card))"}
        stroke={
          hasAlerts
            ? augmented?.alertSeverity === "critical" ? "hsl(0 84% 60%)" : "hsl(38 92% 50%)"
            : isInspected ? "hsl(var(--foreground))" : "hsl(var(--border))"
        }
        strokeWidth={hasAlerts ? 2 : isChamber ? 1.8 : isInspected ? 1.5 : 1}
        className={cn(hasAlerts && augmented?.alertSeverity === "critical" && "animate-pulse")}
      />

      {/* Inner filled circle */}
      <circle
        r={isChamber ? radius - 1 : radius - 2}
        fill={isInspected ? "hsl(var(--muted))" : "hsl(var(--card))"}
        className={cn(
          combinedGlow,
          isOnline && isChamber && "drop-[0_0_6px_rgba(16,185,129,0.6)]",
          isOnline && !isChamber && "drop-[0_0_3px_rgba(16,185,129,0.4)]",
          isWarning && "drop-[0_0_3px_rgba(245,158,11,0.4)] animate-pulse",
          isOffline && "drop-[0_0_3px_rgba(239,68,68,0.2)] opacity-60",
          isCritical && "animate-pulse",
        )}
      />

      {/* Subtle inner ring */}
      <circle
        r={isChamber ? radius - 3 : radius - 4}
        fill="transparent"
        stroke="hsl(var(--muted-foreground))" strokeWidth={0.5}
        opacity={0.05 + breathPhase * 0.05}
      />

      {/* Chamber core glow dot */}
      {isChamber && isOnline && (
        <circle
          r={4} fill="rgba(16,185,129,0.5)"
          className="animate-pulse"
          opacity={0.5 + breathPhase * 0.3}
        />
      )}

      {/* Icon */}
      <text
        textAnchor="middle" dy="0.35em"
        className={cn(
          isChamber ? "text-[13px]" : "text-[9px]",
          "font-bold select-none",
          vis.color,
          isOnline && isChamber && "drop-[0_0_4px_currentColor]",
          isOnline && !isChamber && "drop-[0_0_2px_currentColor]",
          isOffline && "opacity-50",
        )}
      >
        {NODE_ICONS[node.nodeType] ?? "?"}
      </text>

      {/* Label */}
      <text
        x={0} y={radius + 13} textAnchor="middle"
        className={cn(
          isChamber ? "text-[9px] font-semibold" : "text-[7px] font-medium",
          "select-none",
          isOffline ? "fill-muted-foreground/20" : "fill-muted-foreground/70",
          isChamber && "fill-emerald-400/80",
        )}
      >
        {node.label.length > 14 ? node.label.slice(0, 13) + "\u2026" : node.label}
      </text>

      {hasAlerts && (
        <g transform={`translate(${radius - 2}, ${-radius + 2})`}>
          <circle r={6} fill={augmented?.alertSeverity === "critical" ? "#ef4444" : "#f59e0b"} />
          <text textAnchor="middle" dy="0.35em" className="fill-white text-[6px] font-bold">{augmented!.activeAlertCount}</text>
        </g>
      )}
      {hasIncidents && (
        <g transform={`translate(${-radius + 2}, ${-radius + 2})`}>
          <circle r={6} fill="#7c3aed" />
          <text textAnchor="middle" dy="0.35em" className="fill-white text-[6px] font-bold">{augmented!.incidentCount}</text>
        </g>
      )}
      {hasMaintenance && (
        <g transform={`translate(${radius - 2}, ${radius - 2})`}>
          <circle r={6} fill="#f97316" />
          <text textAnchor="middle" dy="0.35em" className="fill-white text-[6px] font-bold">{augmented!.maintenanceCount}</text>
        </g>
      )}
    </g>
  )
})

export function TopologyCanvas() {
  const [mounted, setMounted] = useState(false)
  const time = useAnimationTime()
  const w = 800
  const h = 560
  const unified = useUnifiedOperationalState(w, h)
  const { topologyGraph: graph, augmentedNodes, crossLayer, connected, activities } = unified
  const [inspectedNode, setInspectedNode] = useState<TopologyNode | null>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  const nodeMap = useMemo(() => {
    const m = new Map<string, TopologyNode>()
    if (!graph) return m
    for (const n of graph.nodes) m.set(n.id, n)
    return m
  }, [graph])

  const augMap = useMemo(() => {
    const m = new Map<string, AugmentedNode>()
    for (const n of augmentedNodes) m.set(n.nodeId, n)
    return m
  }, [augmentedNodes])

  const inspectedAugmented = useMemo(
    () => inspectedNode ? augmentedNodes.find((n) => n.nodeId === inspectedNode.id) : null,
    [inspectedNode, augmentedNodes]
  )

  const alertCount = useMemo(() => augmentedNodes.filter((n) => n.activeAlertCount > 0).length, [augmentedNodes])
  const degradedCount = useMemo(
    () => augmentedNodes.filter((n) => n.combinedStatus === "degraded" || n.combinedStatus === "unstable" || n.combinedStatus === "critical").length,
    [augmentedNodes]
  )

  const formattedCohesion = useMemo(() => Math.round(crossLayer.overallCohesion), [crossLayer.overallCohesion])

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Operational Topology
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Distributed environmental intelligence network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
            {connected ? (
              <Wifi className="size-3 text-emerald-500/60" />
            ) : (
              <WifiOff className="size-3 text-muted-foreground/40" />
            )}
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
              {connected ? "TOPOLOGY LIVE" : "LOCAL"}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1">
            <Brain className="size-3 text-violet-500/60" />
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
              Cohesion: {formattedCohesion}%
            </span>
          </div>
        </div>
      </div>

      <ScenarioBanner />

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <TopologyMetrics metrics={unified.topologyMetrics} />
        </div>
        <div className="flex shrink-0 gap-2">
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-2">
              <AlertTriangle className="size-3.5 text-red-500" />
              <span className="text-[10px] font-medium text-red-500">{alertCount} alert{alertCount !== 1 ? "s" : ""}</span>
            </div>
          )}
          {unified.incidentSummary.totalIncidents > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-2">
              <Siren className="size-3.5 text-violet-500" />
              <span className="text-[10px] font-medium text-violet-500">{unified.incidentSummary.openIncidents} incident{unified.incidentSummary.openIncidents !== 1 ? "s" : ""}</span>
            </div>
          )}
          {unified.maintenanceSummary.pending > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 px-2.5 py-2">
              <Wrench className="size-3.5 text-orange-500" />
              <span className="text-[10px] font-medium text-orange-500">{unified.maintenanceSummary.pending} maint</span>
            </div>
          )}
          {degradedCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-2">
              <Shield className="size-3.5 text-amber-500" />
              <span className="text-[10px] font-medium text-amber-500">{degradedCount} degraded</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative rounded-xl border border-border/50 bg-card overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} className="block w-full h-[580px]">
          <BG_GRID w={w} h={h} />

          {graph.links.map((link) => {
            const source = nodeMap.get(link.sourceId)
            const target = nodeMap.get(link.targetId)
            if (!source || !target) return null
            return (
              <SignalLink
                key={link.id}
                link={link}
                activities={activities}
                sourceX={source.x} sourceY={source.y}
                targetX={target.x} targetY={target.y}
                time={time}
                mounted={mounted}
              />
            )
          })}

          <ZoneLabelOverlay zones={graph.zones ?? []} />

          {graph.nodes.map((node) => {
            const aug = augMap.get(node.id)
            return (
              <TopologyNodeDot
                key={node.id}
                node={node}
                augmented={aug}
                isInspected={inspectedNode?.id === node.id}
                onInspect={setInspectedNode}
                time={time}
                mounted={mounted}
              />
            )
          })}
        </svg>

        {inspectedNode && (
          <NodeCard
            node={inspectedNode}
            augmented={inspectedAugmented}
            onClose={() => setInspectedNode(null)}
          />
        )}
      </div>
    </div>
  )
}
