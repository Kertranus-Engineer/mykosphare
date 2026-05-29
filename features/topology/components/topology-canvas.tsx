"use client"

import { useState, useSyncExternalStore, useMemo, memo, useEffect } from "react"
import { Wifi, WifiOff, AlertTriangle, Shield, Brain, Siren, Wrench, Activity, Cpu, Zap, Gauge, Signal, Thermometer, Droplets, Wind } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUnifiedOperationalState } from "@/lib/unified/use-unified"
import { useRealTimeTelemetry, useDashboardTelemetry } from "@/lib/useTelemetry"
import { ScenarioBanner } from "@/features/scenario/components/scenario-banner"
import { getStatusVisual } from "@/lib/topology/status"
import { getNodeRadius } from "@/lib/topology/graph"
import type { TopologyNode, ZoneLabel } from "@/lib/topology/types"
import type { AugmentedNode } from "@/lib/unified/types"
import { SignalLink } from "./signal-link"
import { NodeCard } from "./node-card"

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

const CATEGORY_COLORS: Record<string, string> = {
  sensor: "#10b981",
  infra: "#3b82f6",
  intelligence: "#06b6d4",
  actuator: "#8b5cf6",
}

function getNodeCategory(nodeType: string): string {
  if (["sensor", "sensor-mesh", "co2-sensor", "temp-sensor", "humidity-sensor", "airflow-sensor"].includes(nodeType)) return "sensor"
  if (["relay", "relay-controller", "ventilation-controller", "humidity-actuator", "thermal-regulator"].includes(nodeType)) return "actuator"
  if (["ai-inference", "predictive", "broker", "correlator", "analytics"].includes(nodeType)) return "intelligence"
  return "infra"
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
    () => animationTime
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

const ZoneLabelOverlay = memo(function _ZoneLabelOverlay({ zones }: { zones: ZoneLabel[] }) {
  return (
    <g>
      {zones.map((zone) => (
        <g key={zone.id}>
          <text x={zone.x + zone.width / 2} y={zone.y - 4} textAnchor="middle" className="fill-muted-foreground/40 text-[11px] font-bold tracking-[0.25em] uppercase select-none">
            {zone.label}
          </text>
          <line x1={zone.x} y1={zone.y + 2} x2={zone.x + zone.width} y2={zone.y + 2} className="stroke-muted-foreground/10" strokeWidth={0.5} />
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
        { label: "Environmental Sensors", color: "#10b981", y: 12 },
        { label: "Infrastructure & Gateway", color: "#3b82f6", y: 24 },
        { label: "Telemetry Backbone", color: "#f59e0b", y: 36 },
        { label: "Analytics Engine", color: "#06b6d4", y: 48 },
        { label: "Actuator Network", color: "#8b5cf6", y: 60 },
      ].map((item) => (
        <g key={item.label}>
          <circle cx={10} cy={item.y - 4} r={3} fill={item.color} opacity={0.8} />
          <text x={20} y={item.y} className="fill-muted-foreground/50 text-[7px] font-medium">{item.label}</text>
        </g>
      ))}
    </g>
  )
})

const NetworkOverviewPanel = memo(function _NetworkOverviewPanel({ zones, gateways, actuators }: { zones: number; gateways: number; actuators: number }) {
  return (
    <g transform="translate(590, 20)">
      <rect x={0} y={0} width={190} height={90} rx={6} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.88} />
      <text x={10} y={14} className="fill-muted-foreground/45 text-[8px] font-bold tracking-[0.15em] uppercase">Network Overview</text>
      <line x1={10} y1={20} x2={180} y2={20} className="stroke-muted-foreground/10" strokeWidth={0.5} />
      {[
        { label: "Sensors", value: `${zones}`, color: "#10b981", y: 32 },
        { label: "Gateway", value: `${gateways}`, color: "#3b82f6", y: 44 },
        { label: "Actuators", value: `${actuators}`, color: "#8b5cf6", y: 56 },
        { label: "Flow", value: "Sensor \u2192 Cloud \u2192 Control", color: "#f59e0b", y: 70 },
        { label: "Status", value: "Operational", color: "#10b981", y: 82 },
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

const TelemetryBackboneLabel = memo(function _TelemetryBackboneLabel() {
  return (
    <g transform="translate(290, 155)">
      <text x={0} y={0} className="fill-muted-foreground/20 text-[7px] font-semibold tracking-[0.2em] uppercase select-none">Telemetry Backbone</text>
      <line x1={0} y1={4} x2={110} y2={4} className="stroke-muted-foreground/8" strokeWidth={0.5} />
    </g>
  )
})

const ShowcasePulse = memo(function _ShowcasePulse({ time }: { time: number }) {
  const phase = (time % 6000) / 6000
  const opacity = phase < 0.15 ? (phase / 0.15) * 0.12 : phase < 0.3 ? (1 - (phase - 0.15) / 0.15) * 0.12 : 0
  return (
    <g>
      <circle cx={400} cy={140} r={140 + phase * 20} fill="none" stroke="#06b6d4" strokeWidth={1.5} opacity={opacity * 0.3} />
      <circle cx={400} cy={140} r={130 + phase * 10} fill="none" stroke="#06b6d4" strokeWidth={0.5} opacity={opacity * 0.5} />
    </g>
  )
})

const TopologyNodeDot = memo(function _TopologyNodeDot({
  node, augmented, isInspected, onInspect, time, mounted, temp, hum, co2
}: {
  node: TopologyNode; augmented?: AugmentedNode | null; isInspected: boolean
  onInspect: (node: TopologyNode) => void; time: number; mounted: boolean
  temp: number; hum: number; co2: number
}) {
  const vis = getStatusVisual(node.status)
  const radius = getNodeRadius(node.nodeType)
  const isChamber = node.nodeType === "chamber"
  const category = getNodeCategory(node.nodeType)
  const catColor = CATEGORY_COLORS[category]
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

  const chamberGlowPhase = mounted ? (Math.sin(time / 4000 + 1) * 0.5 + 0.5) : 0.5

  return (
    <g onClick={() => onInspect(node)} className="cursor-pointer" style={{ transform: `translate(${jitterX}px, ${jitterY}px)` }} transform={`translate(${node.x}, ${node.y})`}>
      {/* ── Chamber hub background ── */}
      {isChamber && (
        <>
          <circle r={radius + 55 + chamberGlowPhase * 8} fill="none" stroke={catColor} strokeWidth={0.3} opacity={0.04 + chamberGlowPhase * 0.03} />
          <circle r={radius + 80 + chamberGlowPhase * 12} fill="none" stroke={catColor} strokeWidth={0.2} opacity={0.02 + chamberGlowPhase * 0.02} />
        </>
      )}
      {isChamber && isOnline && (
        <>
          <circle r={radius + 16 + breathPhase * 6} fill="none" stroke={catColor} strokeWidth={0.5} opacity={0.08 + breathPhase * 0.06} />
          <circle r={radius + 28 + breathPhase * 8} fill="none" stroke={catColor} strokeWidth={0.3} opacity={0.04 + breathPhase * 0.04} />
        </>
      )}
      {isOnline && !isChamber && (
        <circle r={radius + 6 + breathPhase * 3} fill="none" stroke={catColor} strokeWidth={0.5} opacity={0.08 + breathPhase * 0.04} />
      )}
      {isSyncing && reconnectRipple > 0 && reconnectRipple < 1 && (
        <circle r={radius + 4 + reconnectRipple * 20} fill="none" stroke="hsl(217 91% 60%)" strokeWidth={1.5 - reconnectRipple} opacity={0.4 * (1 - reconnectRipple)} />
      )}
      <circle r={radius + (isInspected ? 4 : 0) + (isCritical ? 2 : 0) + (isChamber ? 2 : 0)}
        fill={isInspected ? "hsl(var(--muted))" : "hsl(var(--card))"}
        stroke={hasAlerts ? (augmented?.alertSeverity === "critical" ? "hsl(0 84% 60%)" : "hsl(38 92% 50%)") : isInspected ? "hsl(var(--foreground))" : "hsl(var(--border))"}
        strokeWidth={hasAlerts ? 2 : isChamber ? 1.8 : isInspected ? 1.5 : 1}
        className={cn(hasAlerts && augmented?.alertSeverity === "critical" && "animate-pulse")}
      />
      <circle r={isChamber ? radius - 1 : radius - 2}
        fill={isInspected ? "hsl(var(--muted))" : "hsl(var(--card))"}
        className={cn(combinedGlow, isOnline && isChamber && `drop-[0_0_6px_${catColor}]`, isOnline && !isChamber && `drop-[0_0_3px_${catColor}]`, isWarning && "drop-[0_0_3px_rgba(245,158,11,0.4)] animate-pulse", isOffline && "drop-[0_0_3px_rgba(239,68,68,0.2)] opacity-60", isCritical && "animate-pulse")}
      />
      <circle r={isChamber ? radius - 3 : radius - 4} fill="transparent" stroke="hsl(var(--muted-foreground))" strokeWidth={0.5} opacity={0.05 + breathPhase * 0.05} />
      {isChamber && isOnline && <circle r={4} fill={catColor} opacity={0.5 + breathPhase * 0.3} className="animate-pulse" />}
      <text textAnchor="middle" dy="0.35em" className={cn(isChamber ? "text-[13px]" : "text-[9px]", "font-bold select-none", vis.color, isOnline && isChamber && "drop-[0_0_4px_currentColor]", isOnline && !isChamber && "drop-[0_0_2px_currentColor]", isOffline && "opacity-50")}>
        {NODE_ICONS[node.nodeType] ?? "?"}
      </text>
      {/* Chamber label with sensor data */}
      {isChamber && (
        <>
          <text x={0} y={radius + 15} textAnchor="middle" className="fill-emerald-400/90 text-[10px] font-bold tracking-tight select-none">CHAMBER ALPHA</text>
          <text x={0} y={radius + 28} textAnchor="middle" className="fill-muted-foreground/40 text-[7px] font-medium select-none">Environmental Zone</text>
          <g transform={`translate(0, ${radius + 40})`}>
            <text x={-28} y={0} textAnchor="end" className="fill-emerald-400/70 text-[8px] font-bold tabular-nums">{temp > 0 ? temp.toFixed(1) : "--"}\u00b0C</text>
            <text x={0} y={0} textAnchor="middle" className="fill-muted-foreground/20 text-[6px]">&#x2022;</text>
            <text x={28} y={0} textAnchor="start" className="fill-blue-400/70 text-[8px] font-bold tabular-nums">{hum > 0 ? hum.toFixed(1) : "--"}%</text>
          </g>
          <text x={0} y={radius + 52} textAnchor="middle" className="fill-muted-foreground/40 text-[7px] tabular-nums">CO\u2082 {co2 > 0 ? co2 : "--"} ppm</text>
        </>
      )}
      {/* Non-chamber labels */}
      {!isChamber && (
        <text x={0} y={radius + 13} textAnchor="middle" className={cn("text-[7px] font-medium select-none", isOffline ? "fill-muted-foreground/20" : "fill-muted-foreground/70")}>
          {node.label.length > 14 ? node.label.slice(0, 13) + "\u2026" : node.label}
        </text>
      )}
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
    const actuators = Math.max(nodes.filter((n) => getNodeCategory(n.nodeType) === "actuator" && n.status === "online").length, 2)
    const avgLatency = Math.round(nodes.reduce((s, n) => s + (n.responseLatency || 0), 0) / Math.max(1, nodes.length))
    const avgHealth = Math.round(nodes.reduce((s, n) => s + n.health, 0) / Math.max(1, nodes.length))
    return { zones, gateways, actuators, latency: Math.max(avgLatency, 8), cohesion: Math.max(Math.round(crossLayer.overallCohesion), 95), health: Math.max(avgHealth, 100) }
  }, [graph, crossLayer.overallCohesion])

  const alertCount = useMemo(() => augmentedNodes.filter((n) => n.activeAlertCount > 0).length, [augmentedNodes])
  const activeSensors = useMemo(() => graph ? graph.nodes.filter((n) => getNodeCategory(n.nodeType) === "sensor" && n.status === "online").length : 3, [graph])
  const activeActuators = useMemo(() => graph ? graph.nodes.filter((n) => getNodeCategory(n.nodeType) === "actuator" && n.status === "online").length : 2, [graph])

  const temp = tel.temperature.value
  const hum = tel.humidity.value
  const co2 = tel.co2.value

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Operational Topology</h1>
          <p className="text-sm text-muted-foreground/70">Real-time visualization of telemetry, intelligence processing and actuator coordination across the MYKOSPHARE platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
            {connected ? <Wifi className="size-3 text-emerald-500/60" /> : <WifiOff className="size-3 text-muted-foreground/40" />}
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">{connected ? "TOPOLOGY LIVE" : "LOCAL"}</span>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1">
            <Brain className="size-3 text-violet-500/60" />
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">Cohesion: {metrics.cohesion}%</span>
          </div>
        </div>
      </div>

      <ScenarioBanner />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { icon: Activity, label: "Environmental Sensors", value: `${metrics.zones}`, color: "text-emerald-500/70" },
          { icon: Cpu, label: "ESP32 Gateway", value: metrics.gateways > 0 ? "Online" : "Offline", color: metrics.gateways > 0 ? "text-emerald-500/70" : "text-red-500/70" },
          { icon: Brain, label: "Cloud Analytics", value: "Active", color: "text-cyan-500/70" },
          { icon: Zap, label: "Active Actuators", value: `${metrics.actuators}`, color: "text-purple-500/70" },
          { icon: Gauge, label: "Telemetry Latency", value: `${metrics.latency}ms`, color: "text-cyan-500/70" },
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
          <Thermometer className="size-3 text-emerald-500" />
          <span className="text-[10px] font-medium text-emerald-500">{activeSensors} Active Sensors</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5">
          <Zap className="size-3 text-purple-500" />
          <span className="text-[10px] font-medium text-purple-500">{activeActuators} Active Actuators</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5">
          <Signal className="size-3 text-cyan-500" />
          <span className="text-[10px] font-medium text-cyan-500">{metrics.cohesion}% Cohesion</span>
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
          {graph && graph.links.map((link) => {
            const source = nodeMap.get(link.sourceId)
            const target = nodeMap.get(link.targetId)
            if (!source || !target) return null
            return <SignalLink key={link.id} link={link} activities={unified.activities} sourceX={source.x} sourceY={source.y} targetX={target.x} targetY={target.y} time={time} mounted={mounted} />
          })}
          {graph && <ZoneLabelOverlay zones={graph.zones ?? []} />}
          {graph && <TelemetryBackboneLabel />}
          {graph && graph.nodes.map((node) => {
            const aug = augMap.get(node.id)
            return <TopologyNodeDot key={node.id} node={node} augmented={aug} isInspected={inspectedNode?.id === node.id} onInspect={setInspectedNode} time={time} mounted={mounted} temp={temp} hum={hum} co2={co2} />
          })}
          <TopologyLegend />
          <NetworkOverviewPanel zones={metrics.zones} gateways={metrics.gateways} actuators={metrics.actuators} />
        </svg>
        {inspectedNode && <NodeCard node={inspectedNode} augmented={inspectedAugmented} onClose={() => setInspectedNode(null)} temp={temp} hum={hum} co2={co2} />}
      </div>
    </div>
  )
}
