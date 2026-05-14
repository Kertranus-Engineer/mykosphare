"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Wifi, WifiOff, AlertTriangle, Shield, Brain, Siren, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUnifiedOperationalState } from "@/lib/unified/use-unified"
import { ScenarioBanner } from "@/features/scenario/components/scenario-banner"
import { getStatusVisual } from "@/lib/topology/status"
import type { TopologyNode } from "@/lib/topology/types"
import type { AugmentedNode } from "@/lib/unified/types"
import { SignalLink } from "./signal-link"
import { NodeCard } from "./node-card"
import { TopologyMetrics } from "./topology-metrics"

const NODE_ICONS: Record<string, string> = {
  chamber: "⬡",
  esp32: "◆",
  sensor: "●",
  relay: "▣",
  camera: "◈",
  power: "⚡",
  cloud: "☁",
  simulator: "⌘",
}

const COMBINED_GLOW: Record<string, string> = {
  optimal: "drop-[0_0_4px_rgba(16,185,129,0.4)]",
  stable: "drop-[0_0_4px_rgba(59,130,246,0.3)]",
  degraded: "drop-[0_0_4px_rgba(245,158,11,0.3)]",
  unstable: "drop-[0_0_4px_rgba(249,115,22,0.4)]",
  critical: "drop-[0_0_4px_rgba(239,68,68,0.5)]",
}

function TopologyNodeDot({
  node,
  augmented,
  isInspected,
  onInspect,
}: {
  node: TopologyNode
  augmented?: AugmentedNode | null
  isInspected: boolean
  onInspect: (node: TopologyNode) => void
}) {
  const vis = getStatusVisual(node.status)
  const radius = node.nodeType === "chamber" ? 22 : node.nodeType === "cloud" ? 18 : 14
  const combinedGlow = augmented ? COMBINED_GLOW[augmented.combinedStatus] ?? "" : ""
  const hasAlerts = augmented && augmented.activeAlertCount > 0
  const hasIncidents = augmented && augmented.incidentCount > 0
  const hasMaintenance = augmented && augmented.maintenanceCount > 0
  const isCritical = augmented?.combinedStatus === "critical" || augmented?.combinedStatus === "unstable"
  const isDegraded = node.status === "degraded" || node.status === "offline"
  const isActive = node.status === "online" || node.status === "syncing"

  return (
    <g
      onClick={() => onInspect(node)}
      className={cn("cursor-pointer transition-all duration-300", isDegraded && "opacity-55")}
      style={{ transition: "transform 0.3s ease" }}
      transform={`translate(${node.x}, ${node.y})`}
    >
      <circle
        r={radius + (isInspected ? 4 : 0) + (isCritical ? 2 : 0)}
        fill={isInspected ? "hsl(var(--muted))" : "hsl(var(--card))"}
        stroke={
          hasAlerts
            ? augmented?.alertSeverity === "critical"
              ? "hsl(0 84% 60%)"
              : augmented?.alertSeverity === "warning"
                ? "hsl(38 92% 50%)"
                : isInspected
                  ? "hsl(var(--foreground))"
                  : "hsl(var(--border))"
            : isInspected
              ? "hsl(var(--foreground))"
              : "hsl(var(--border))"
        }
        strokeWidth={hasAlerts ? 2 : isInspected ? 1.5 : 1}
        className={cn(
          "transition-all duration-200",
          hasAlerts && augmented?.alertSeverity === "critical" && "animate-pulse"
        )}
      />
      <circle
        r={radius - 2}
        fill={isInspected ? "hsl(var(--muted))" : "hsl(var(--card))"}
        className={cn(
          "transition-all duration-300",
          combinedGlow,
          node.status === "online" && "drop-[0_0_3px_rgba(16,185,129,0.3)]",
          node.status === "syncing" && "drop-[0_0_3px_rgba(59,130,246,0.3)]",
          node.status === "warning" && "drop-[0_0_3px_rgba(249,115,22,0.3)]",
          isCritical && "animate-pulse"
        )}
      />
      <text
        textAnchor="middle"
        dy="0.35em"
        className={cn(
          "text-[10px] font-bold select-none",
          vis.color,
          node.status === "online" && "drop-[0_0_2px_currentColor]",
          isDegraded && "opacity-60"
        )}
      >
        {NODE_ICONS[node.nodeType] ?? "?"}
      </text>
      <text
        x={0}
        y={radius + 14}
        textAnchor="middle"
        className={cn(
          "text-[8px] font-medium select-none transition-all duration-300",
          isDegraded ? "fill-muted-foreground/30" : "fill-muted-foreground/60"
        )}
      >
        {node.label.length > 12 ? node.label.slice(0, 12) + "…" : node.label}
      </text>
      {node.status === "syncing" && (
        <circle
          r={radius + 5}
          fill="none"
          stroke="hsl(var(--blue-500))"
          strokeWidth={1}
          strokeDasharray="4 3"
          className="opacity-50"
          style={{ animation: "spin 3s linear infinite" }}
        />
      )}
      {isActive && (
        <circle
          r={radius + 2}
          fill="none"
          className={cn(
            "opacity-30",
            node.status === "online" ? "stroke-emerald-500/40" : "stroke-blue-500/40"
          )}
          strokeWidth={0.5}
          style={{ animation: "glow-pulse 3s ease-in-out infinite" }}
        />
      )}
      {hasAlerts && (
        <g transform={`translate(${radius - 2}, ${-radius + 2})`}>
          <circle r={5} fill={augmented?.alertSeverity === "critical" ? "#ef4444" : "#f59e0b"} className="drop-[0_0_2px_currentColor]" />
          <text
            textAnchor="middle"
            dy="0.35em"
            className="fill-white text-[6px] font-bold"
          >
            {augmented!.activeAlertCount}
          </text>
        </g>
      )}
      {hasIncidents && (
        <g transform={`translate(${-radius + 2}, ${-radius + 2})`}>
          <circle r={5} fill="#7c3aed" className="drop-[0_0_3px_rgba(124,58,237,0.5)]" />
          <text
            textAnchor="middle"
            dy="0.35em"
            className="fill-white text-[6px] font-bold"
          >
            {augmented!.incidentCount}
          </text>
        </g>
      )}
      {hasMaintenance && (
        <g transform={`translate(${radius - 2}, ${radius - 2})`}>
          <circle r={5} fill="#f97316" className="drop-[0_0_3px_rgba(249,115,22,0.5)]" />
          <text
            textAnchor="middle"
            dy="0.35em"
            className="fill-white text-[6px] font-bold"
          >
            {augmented!.maintenanceCount}
          </text>
        </g>
      )}
    </g>
  )
}

export function TopologyCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 640, h: 480 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ w: Math.max(width, 320), h: Math.max(height, 360) })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const unified = useUnifiedOperationalState(size.w, size.h)
  const { topologyGraph: graph, topologyMetrics: metrics, augmentedNodes, crossLayer, connected, activities } = unified
  const [inspectedNode, setInspectedNode] = useState<TopologyNode | null>(null)

  const nodeMap = useMemo(() => {
    const map = new Map<string, TopologyNode>()
    if (!graph) return map
    for (const n of graph.nodes) map.set(n.id, n)
    return map
  }, [graph])

  const augMap = useMemo(() => {
    const map = new Map<string, AugmentedNode>()
    for (const n of augmentedNodes) map.set(n.nodeId, n)
    return map
  }, [augmentedNodes])

  const linkMap = useMemo(() => {
    const map = new Map<string, typeof graph.links[0]>()
    if (!graph) return map
    for (const l of graph.links) map.set(l.id, l)
    return map
  }, [graph])

  const uniqueActivityPositions = useMemo(() => {
    const positions: { id: number; x: number; y: number; strength: number; type: string }[] = []
    if (!graph) return positions
    const limit = Math.min(activities.length, 5)
    for (let i = 0; i < limit; i++) {
      const a = activities[i]
      const link = linkMap.get(a.linkId)
      if (link) {
        const source = nodeMap.get(link.sourceId)
        const target = nodeMap.get(link.targetId)
        if (source && target) {
          const offset = ((a.timestamp * 13 + i * 7) % 100 - 50) / 50 * 30
          positions.push({
            id: a.timestamp,
            x: (source.x + target.x) / 2 + offset,
            y: (source.y + target.y) / 2 + ((a.timestamp * 17 + i * 11) % 100 - 50) / 50 * 30,
            strength: a.strength,
            type: a.type,
          })
        }
      }
    }
    return positions
  }, [activities, graph, linkMap, nodeMap])

  const inspectedAugmented = inspectedNode
    ? augmentedNodes.find((n) => n.nodeId === inspectedNode.id)
    : null

  const alertCount = augmentedNodes.filter((n) => n.activeAlertCount > 0).length
  const degradedCount = augmentedNodes.filter(
    (n) => n.combinedStatus === "degraded" || n.combinedStatus === "unstable" || n.combinedStatus === "critical"
  ).length

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Operational Topology
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Live network visualization with cross-layer integration
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
              Cohesion: {crossLayer.overallCohesion}%
            </span>
          </div>
        </div>
      </div>

      <ScenarioBanner />

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <TopologyMetrics metrics={metrics} />
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
              <span className="text-[10px] font-medium text-orange-500">{unified.maintenanceSummary.pending} maintenance</span>
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

      <div className="relative rounded-xl border border-border/50 bg-card">
        <div
          ref={containerRef}
          className="relative h-[480px] w-full overflow-hidden"
        >
          <svg
            width={size.w}
            height={size.h}
            className="absolute inset-0"
            style={{ minWidth: size.w, minHeight: size.h }}
          >
            {graph.links.map((link) => {
              const source = nodeMap.get(link.sourceId)
              const target = nodeMap.get(link.targetId)
              if (!source || !target) return null
              return (
                <SignalLink
                  key={link.id}
                  link={link}
                  activities={activities}
                  sourceX={source.x}
                  sourceY={source.y}
                  targetX={target.x}
                  targetY={target.y}
                />
              )
            })}
            {graph.nodes.map((node) => {
              const aug = augMap.get(node.id)
              return (
                <TopologyNodeDot
                  key={node.id}
                  node={node}
                  augmented={aug}
                  isInspected={inspectedNode?.id === node.id}
                  onInspect={setInspectedNode}
                />
              )
            })}
          </svg>

          {uniqueActivityPositions.map((p) => (
            <div
              key={p.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: p.x, top: p.y }}
            >
              <div
                className={cn(
                  "rounded-full border-2 animate-ping opacity-75",
                  p.type === "telemetry"
                    ? "border-emerald-500/50"
                    : p.type === "heartbeat"
                      ? "border-blue-500/50"
                      : "border-violet-500/50"
                )}
                style={{ width: 8 + p.strength * 12, height: 8 + p.strength * 12 }}
              />
            </div>
          ))}
        </div>

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
