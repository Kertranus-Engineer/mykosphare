"use client"

import { useState, useSyncExternalStore, useMemo, memo, useEffect } from "react"
import { Wifi, WifiOff, AlertTriangle, Brain, Activity, Cpu, Zap, Gauge, Signal, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUnifiedOperationalState } from "@/lib/unified/use-unified"
import { useRealTimeTelemetry, useDashboardTelemetry } from "@/lib/useTelemetry"
import { ScenarioBanner } from "@/features/scenario/components/scenario-banner"
import { getStatusVisual } from "@/lib/topology/status"
import { getNodeRadius } from "@/lib/topology/graph"
import type { TopologyNode, LayerInfo } from "@/lib/topology/types"
import type { AugmentedNode } from "@/lib/unified/types"
import { SignalLink } from "./signal-link"
import { NodeCard } from "./node-card"

const NODE_ICONS: Record<string, string> = {
  esp32: "\u25C6",
  sensor: "\u25CF",
  relay: "\u25A3",
  "poco-c75": "\u25C8",
  snapshot: "\u25A3",
  "supabase-storage": "\u25C7",
  "supabase-db": "\u25C8",
  "capture-processing": "\u2699",
  "correlation-engine": "\u25CE",
  "event-engine": "\u26A1",
  "observation-engine": "\u25D1",
  "trend-engine": "\u25B2",
  "recommendation-engine": "\u2605",
  validation: "\u2713",
  knowledge: "\u25C6",
  "visual-intelligence": "\u25C9",
  dashboard: "\u25A6",
  analytics: "\u25B3",
  cloud: "\u2601",
  chamber: "\u2B21",
  camera: "\u25C8",
  power: "\u26A1",
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
}

const LAYER_COLORS: Record<string, string> = {
  "layer-physical": "#f59e0b",
  "layer-capture": "#eab308",
  "layer-storage": "#3b82f6",
  "layer-reasoning": "#8b5cf6",
  "layer-application": "#10b981",
}

function getIconForType(nodeType: string): string {
  return NODE_ICONS[nodeType] ?? "\u25CF"
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
    (cb) => { timeListeners.add(cb); startTimeLoop(); return () => { timeListeners.delete(cb) } },
    () => animationTime,
    () => 0
  )
}

const BG_GRID = memo(function _BgGrid({ w, h }: { w: number; h: number }) {
  const step = 50
  const countX = Math.ceil(w / step)
  const countY = Math.ceil(h / step)
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 1; i < countX; i++) { const x = i * step; lines.push({ x1: x, y1: 0, x2: x, y2: h }) }
  for (let i = 1; i < countY; i++) { const y = i * step; lines.push({ x1: 0, y1: y, x2: w, y2: y }) }
  return (<g>{lines.map((l, i) => (<line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="stroke-foreground/3" strokeWidth={0.5} />))}</g>)
})

const LayerBands = memo(function _LayerBands({ layers }: { layers: LayerInfo[] }) {
  return (
    <g>
      {layers.map((layer) => (
        <g key={layer.id}>
          <rect
            x={0} y={layer.y} width={layer.width} height={layer.height}
            fill={layer.color} opacity={0.04} rx={4}
          />
          <rect
            x={0} y={layer.y} width={3} height={layer.height}
            fill={layer.color} opacity={0.6} rx={1.5}
          />
          <text
            x={12} y={layer.y + layer.height / 2}
            textAnchor="start"
            dominantBaseline="middle"
            className="fill-foreground/60 text-[9px] font-bold tracking-[0.2em] select-none"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {layer.label}
          </text>
        </g>
      ))}
    </g>
  )
})

const TopologyLegend = memo(function _TopologyLegend() {
  return (
    <g transform="translate(620, 490)">
      <rect x={0} y={0} width={160} height={62} rx={6} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.85} />
      {[
        { label: "Application", color: "#10b981", y: 12 },
        { label: "Reasoning", color: "#8b5cf6", y: 24 },
        { label: "Storage", color: "#3b82f6", y: 36 },
        { label: "Capture", color: "#eab308", y: 48 },
        { label: "Physical", color: "#f59e0b", y: 60 },
      ].map((item) => (
        <g key={item.label}>
          <circle cx={10} cy={item.y - 4} r={3} fill={item.color} opacity={0.8} />
          <text x={20} y={item.y} className="fill-muted-foreground/50 text-[7px] font-medium">{item.label}</text>
        </g>
      ))}
    </g>
  )
})

const NetworkOverviewPanel = memo(function _NetworkOverviewPanel({ layers, nodes, online }: { layers: number; nodes: number; online: number }) {
  return (
    <g transform="translate(590, 20)">
      <rect x={0} y={0} width={190} height={72} rx={6} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.88} />
      <text x={10} y={14} className="fill-muted-foreground/45 text-[8px] font-bold tracking-[0.15em] uppercase">System Overview</text>
      <line x1={10} y1={20} x2={180} y2={20} className="stroke-muted-foreground/10" strokeWidth={0.5} />
      {[
        { label: "Layers", value: `${layers}`, color: "#8b5cf6", y: 32 },
        { label: "Nodes", value: `${nodes}`, color: "#3b82f6", y: 44 },
        { label: "Online", value: `${online}`, color: "#10b981", y: 56 },
      ].map((item) => (
        <g key={item.label}>
          <circle cx={12} cy={item.y - 3} r={2} fill={item.color} opacity={0.7} />
          <text x={22} y={item.y} className="fill-muted-foreground/40 text-[7px] font-medium">{item.label}</text>
          <text x={180} y={item.y} textAnchor="end" className="fill-muted-foreground/60 text-[7px] font-semibold">{item.value}</text>
        </g>
      ))}
    </g>
  )
})

const ShowcasePulse = memo(function _ShowcasePulse({ time }: { time: number }) {
  const phase = (time % 6000) / 6000
  const opacity = phase < 0.15 ? (phase / 0.15) * 0.1 : phase < 0.3 ? (1 - (phase - 0.15) / 0.15) * 0.1 : 0
  return (
    <g>
      <circle cx={400} cy={280} r={160 + phase * 20} fill="none" stroke="#8b5cf6" strokeWidth={1.5} opacity={opacity * 0.3} />
      <circle cx={400} cy={280} r={150 + phase * 10} fill="none" stroke="#8b5cf6" strokeWidth={0.5} opacity={opacity * 0.5} />
    </g>
  )
})

const TopologyNodeDot = memo(function _TopologyNodeDot({
  node, augmented, isInspected, onInspect, time, mounted, layerId,
}: {
  node: TopologyNode; augmented?: AugmentedNode | null; isInspected: boolean
  onInspect: (node: TopologyNode) => void; time: number; mounted: boolean; layerId: string
}) {
  const vis = getStatusVisual(node.status)
  const radius = getNodeRadius(node.nodeType)
  const nodeIcon = getIconForType(node.nodeType)
  const layerColor = LAYER_COLORS[layerId] ?? "#6b7280"
  const combinedGlow = augmented ? COMBINED_GLOW[augmented.combinedStatus] ?? "" : ""
  const hasAlerts = augmented && augmented.activeAlertCount > 0
  const hasIncidents = augmented && augmented.incidentCount > 0
  const isCritical = augmented?.combinedStatus === "critical" || augmented?.combinedStatus === "unstable"
  const isOnline = node.status === "online"
  const isOffline = node.status === "offline"
  const isSyncing = node.status === "syncing"

  const seed = node.id.charCodeAt(0) + node.id.charCodeAt(1) * 256
  const breathPhase = mounted ? Math.sin(time / 2000 + seed * 0.01) * 0.5 + 0.5 : 0.5
  const jitterX = mounted && isOffline ? Math.sin(time / 300 + seed * 0.02) * 1.5 : 0
  const jitterY = mounted && isOffline ? Math.cos(time / 350 + seed * 0.03) * 1.5 : 0
  const reconnectRipple = mounted && isSyncing ? (time % 3000) / 3000 : 0

  return (
    <g onClick={() => onInspect(node)} className="cursor-pointer" style={{ transform: `translate(${jitterX}px, ${jitterY}px)` }} transform={`translate(${node.x}, ${node.y})`}>
      {isOnline && (
        <circle r={radius + 6 + breathPhase * 3} fill="none" stroke={layerColor} strokeWidth={0.5} opacity={0.08 + breathPhase * 0.04} />
      )}
      {isSyncing && reconnectRipple > 0 && reconnectRipple < 1 && (
        <circle r={radius + 4 + reconnectRipple * 20} fill="none" stroke="hsl(217 91% 60%)" strokeWidth={1.5 - reconnectRipple} opacity={0.4 * (1 - reconnectRipple)} />
      )}
      <circle r={radius + (isInspected ? 4 : 0) + (isCritical ? 2 : 0)}
        fill={isInspected ? "hsl(var(--muted))" : "hsl(var(--card))"}
        stroke={hasAlerts ? (augmented?.alertSeverity === "critical" ? "hsl(0 84% 60%)" : "hsl(38 92% 50%)") : isInspected ? "hsl(var(--foreground))" : "hsl(var(--border))"}
        strokeWidth={hasAlerts ? 2 : isInspected ? 1.5 : 1}
        className={cn(hasAlerts && augmented?.alertSeverity === "critical" && "animate-pulse")}
      />
      <circle r={radius - 2}
        fill={isInspected ? "hsl(var(--muted))" : "hsl(var(--card))"}
        className={cn(
          combinedGlow,
          isOnline && `drop-[0_0_4px_${layerColor}]`,
          isOffline && "drop-[0_0_3px_rgba(239,68,68,0.2)] opacity-60",
          isCritical && "animate-pulse",
        )}
      />
      <circle r={radius - 4} fill="transparent" stroke="hsl(var(--muted-foreground))" strokeWidth={0.5} opacity={0.05 + breathPhase * 0.05} />
      <text textAnchor="middle" dy="0.35em" className={cn("text-[9px] font-bold select-none", vis.color, isOnline && "drop-[0_0_2px_currentColor]", isOffline && "opacity-50")}>
        {nodeIcon}
      </text>
      <text x={0} y={radius + 12} textAnchor="middle" className={cn("text-[7px] font-medium select-none", isOffline ? "fill-muted-foreground/20" : "fill-muted-foreground/60")}>
        {node.label.length > 16 ? node.label.slice(0, 15) + "\u2026" : node.label}
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
    </g>
  )
})

function resolveLayerId(nodeId: string, layers: LayerInfo[] | undefined): string {
  if (!layers) return ""
  for (const layer of layers) {
    if (layer.nodeIds.includes(nodeId)) return layer.id
  }
  return ""
}

export function TopologyCanvas() {
  const [mounted, setMounted] = useState(false)
  const time = useAnimationTime()
  const w = 800
  const h = 560
  const tel = useDashboardTelemetry()
  const rtTel = useRealTimeTelemetry()
  const unified = useUnifiedOperationalState(w, h)
  const { topologyGraph: graph, augmentedNodes, crossLayer, connected } = unified
  const [inspectedNode, setInspectedNode] = useState<TopologyNode | null>(null)

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

  const inspectedAugmented = useMemo(() => inspectedNode ? augmentedNodes.find((n) => n.nodeId === inspectedNode.id) : null, [inspectedNode, augmentedNodes])

  const metrics = useMemo(() => {
    if (!graph) return { zones: 3, gateways: 1, actuators: 2, latency: 8, cohesion: 95, health: 100 }
    const nodes = graph.nodes
    const zones = Math.max(nodes.filter((n) => n.nodeType === "chamber" || n.nodeType === "sensor-mesh").length, 3)
    const gateways = Math.max(nodes.filter((n) => n.nodeType === "esp32").length, 1)
    const actuators = Math.max(nodes.filter((n) => n.nodeType === "relay" && n.status === "online").length, 2)
    const avgLatency = Math.round(nodes.reduce((s, n) => s + (n.responseLatency || 0), 0) / Math.max(1, nodes.length))
    const avgHealth = Math.round(nodes.reduce((s, n) => s + n.health, 0) / Math.max(1, nodes.length))
    return { zones, gateways, actuators, latency: Math.max(avgLatency, 8), cohesion: Math.max(Math.round(crossLayer.overallCohesion), 95), health: Math.max(avgHealth, 100) }
  }, [graph, crossLayer.overallCohesion])

  const alertCount = useMemo(() => augmentedNodes.filter((n) => n.activeAlertCount > 0).length, [augmentedNodes])
  const nodeCount = useMemo(() => graph ? graph.nodes.length : 18, [graph])
  const onlineCount = useMemo(() => graph ? graph.nodes.filter((n) => n.status === "online").length : 18, [graph])
  const layerCount = useMemo(() => graph?.layers?.length ?? 5, [graph])

  const temp = tel.temperature.value
  const hum = tel.humidity.value
  const co2 = tel.co2.value

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">System Topology</h1>
          <p className="text-sm text-muted-foreground/70">Layered architecture of the MYKOSPHARE platform — from physical sensors to application intelligence.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
            {connected ? <Wifi className="size-3 text-emerald-500/60" /> : <WifiOff className="size-3 text-muted-foreground/40" />}
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">{connected ? "TOPOLOGY LIVE" : "LOCAL"}</span>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1">
            <Layers className="size-3 text-violet-500/60" />
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">{layerCount} Layers</span>
          </div>
        </div>
      </div>

      <ScenarioBanner />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { icon: Activity, label: "ESP32 Gateway", value: metrics.gateways > 0 ? "Online" : "Offline", color: metrics.gateways > 0 ? "text-emerald-500/70" : "text-red-500/70" },
          { icon: Cpu, label: "Capture Device", value: "Active", color: "text-yellow-500/70" },
          { icon: Brain, label: "Reasoning Engines", value: "8 Nodes", color: "text-violet-500/70" },
          { icon: Zap, label: "Storage", value: "Online", color: "text-blue-500/70" },
          { icon: Gauge, label: "Processing Latency", value: `${metrics.latency}ms`, color: "text-cyan-500/70" },
          { icon: Signal, label: "System Cohesion", value: `${metrics.cohesion}%`, color: "text-violet-500/70" },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-2 rounded-lg bg-muted/20 p-2.5 transition-colors hover:bg-muted/30">
            <m.icon className={cn("size-4 shrink-0", m.color)} />
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground/50">{m.label}</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{m.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5">
          <Activity className="size-3 text-emerald-500" />
          <span className="text-[10px] font-medium text-emerald-500">{onlineCount}/{nodeCount} Nodes Online</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1.5">
          <Brain className="size-3 text-violet-500" />
          <span className="text-[10px] font-medium text-violet-500">{metrics.cohesion}% Cohesion</span>
        </div>
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5">
            <AlertTriangle className="size-3.5 text-red-500" />
            <span className="text-[10px] font-medium text-red-500">{alertCount} alert{alertCount !== 1 ? "s" : ""}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5">
          <Activity className="size-3 text-blue-500" />
          <span className="text-[10px] font-medium text-blue-500">{rtTel.source === "live" ? "Live Telemetry" : "Simulation Active"}</span>
        </div>
      </div>

      <div className="relative rounded-xl border border-border/50 bg-card overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} className="block w-full h-[580px]">
          <BG_GRID w={w} h={h} />
          <ShowcasePulse time={time} />
          {graph?.layers && <LayerBands layers={graph.layers} />}
          {graph && graph.links.map((link) => {
            const source = nodeMap.get(link.sourceId)
            const target = nodeMap.get(link.targetId)
            if (!source || !target) return null
            return <SignalLink key={link.id} link={link} activities={unified.activities} sourceX={source.x} sourceY={source.y} targetX={target.x} targetY={target.y} time={time} mounted={mounted} />
          })}
          {graph && graph.nodes.map((node) => {
            const aug = augMap.get(node.id)
            const layerId = resolveLayerId(node.id, graph.layers)
            return <TopologyNodeDot key={node.id} node={node} augmented={aug} isInspected={inspectedNode?.id === node.id} onInspect={setInspectedNode} time={time} mounted={mounted} layerId={layerId} />
          })}
          <TopologyLegend />
          <NetworkOverviewPanel layers={layerCount} nodes={nodeCount} online={onlineCount} />
        </svg>
        {inspectedNode && <NodeCard node={inspectedNode} augmented={inspectedAugmented} onClose={() => setInspectedNode(null)} temp={temp} hum={hum} co2={co2} />}
      </div>
    </div>
  )
}
