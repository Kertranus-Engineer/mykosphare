import type { TopologyNode, SignalLink, TopologyGraph, LayerInfo, ConnectionState } from "./types"
import type { NodeType, NodeStatus, DeviceCapability } from "./node-types"

interface NodeDef {
  id: string
  nodeType: NodeType
  label: string
  capabilities: DeviceCapability[]
  metadata: Record<string, string | number | boolean | null>
}

function determineStatus(
  health: number,
  lastHeartbeat: string | null,
  lastTelemetry: string | null,
): NodeStatus {
  if (!lastHeartbeat && !lastTelemetry) return "standby"
  const now = Date.now()
  const heartbeatAge = lastHeartbeat ? now - new Date(lastHeartbeat).getTime() : Infinity
  const telemetryAge = lastTelemetry ? now - new Date(lastTelemetry).getTime() : Infinity
  if (health < 80) return "offline"
  if (health < 90) return "degraded"
  if (heartbeatAge > 300_000 && telemetryAge > 300_000) return "offline"
  if (heartbeatAge > 120_000 || telemetryAge > 120_000) return "warning"
  if (heartbeatAge > 60_000 || telemetryAge > 60_000) return "syncing"
  return "online"
}

function computeTelemetryQuality(lastTelemetry: string | null): number {
  if (!lastTelemetry) return 0
  const age = Date.now() - new Date(lastTelemetry).getTime()
  if (age < 10_000) return 100
  if (age < 30_000) return 85
  if (age < 60_000) return 60
  if (age < 120_000) return 35
  return 10
}

function computeConnectionState(
  link: { active: boolean; quality: number },
  sourceStatus: NodeStatus,
  targetStatus: NodeStatus,
): ConnectionState {
  if (!link.active || sourceStatus === "offline" || targetStatus === "offline") return "offline"
  if (link.quality < 50) return "critical"
  if (link.quality < 75 || sourceStatus === "degraded" || targetStatus === "degraded") return "warning"
  return "nominal"
}

function hashRandom(seed: number): number {
  const s = (seed * 16807) % 2147483647
  return (s - 1) / 2147483646
}

export function getNodeRadius(nodeType: NodeType): number {
  switch (nodeType) {
    case "esp32": return 14
    case "sensor": case "relay": return 10
    case "poco-c75": case "snapshot": return 12
    case "supabase-storage": case "supabase-db": return 14
    case "capture-processing": return 16
    case "correlation-engine": case "event-engine":
    case "observation-engine": case "trend-engine":
    case "recommendation-engine": case "validation": case "knowledge":
      return 12
    case "visual-intelligence": case "dashboard": case "analytics": return 14
    case "chamber": return 28
    case "cloud": case "remote-sync": return 16
    case "ai-inference": case "predictive": case "broker": case "correlator": return 15
    case "edge-compute": return 14
    case "archive": case "failover": case "recovery": return 10
    case "power": case "simulator": return 9
    default: return 8
  }
}

const LAYER_DEFS = [
  {
    id: "layer-application", label: "APPLICATION", color: "#10b981",
    y: 50, h: 75, nodeY: 88,
    nodePositions: [
      { id: "app-visual-intelligence", x: 170 },
      { id: "app-dashboard", x: 400 },
      { id: "app-analytics", x: 630 },
    ],
  },
  {
    id: "layer-reasoning", label: "REASONING", color: "#8b5cf6",
    y: 140, h: 170, nodeY: 0,
    nodePositions: [
      { id: "rea-processing", x: 135, row: 0 },
      { id: "rea-correlation", x: 295, row: 0 },
      { id: "rea-events", x: 455, row: 0 },
      { id: "rea-observations", x: 615, row: 0 },
      { id: "rea-trends", x: 135, row: 1 },
      { id: "rea-recommendations", x: 295, row: 1 },
      { id: "rea-validation", x: 455, row: 1 },
      { id: "rea-knowledge", x: 615, row: 1 },
    ],
  },
  {
    id: "layer-storage", label: "STORAGE", color: "#3b82f6",
    y: 320, h: 70, nodeY: 355,
    nodePositions: [
      { id: "sto-supabase-storage", x: 250 },
      { id: "sto-supabase-db", x: 550 },
    ],
  },
  {
    id: "layer-capture", label: "CAPTURE", color: "#eab308",
    y: 400, h: 75, nodeY: 438,
    nodePositions: [
      { id: "cap-poco", x: 250 },
      { id: "cap-snapshots", x: 550 },
    ],
  },
  {
    id: "layer-physical", label: "PHYSICAL", color: "#f59e0b",
    y: 490, h: 60, nodeY: 520,
    nodePositions: [
      { id: "phy-esp32", x: 170 },
      { id: "phy-sensors", x: 400 },
      { id: "phy-actuators", x: 630 },
    ],
  },
] as const

export function buildTopologyGraph(
  nodeDefs: NodeDef[],
  deviceHealthMap: Map<string, number>,
  heartbeatMap: Map<string, string>,
  telemetryMap: Map<string, string>,
): TopologyGraph {
  const positions = new Map<string, { x: number; y: number }>()

  for (const layer of LAYER_DEFS) {
    for (const np of layer.nodePositions) {
      const row = (np as { row?: number }).row ?? 0
      const y = layer.nodeY > 0 ? layer.nodeY : layer.y + 55 + row * 70
      positions.set(np.id, { x: np.x, y })
    }
  }

  const nodes: TopologyNode[] = nodeDefs.map((d, idx) => {
    const pos = positions.get(d.id) ?? { x: 400, y: 280 }
    const health = deviceHealthMap.get(d.id) ?? 100
    const lastHeartbeat = heartbeatMap.get(d.id) ?? null
    const lastTelemetry = telemetryMap.get(d.id) ?? null
    const tq = computeTelemetryQuality(lastTelemetry)
    const telemetryLoad = tq >= 85 ? "Low" : tq >= 60 ? "Moderate" : tq >= 30 ? "Elevated" : "Critical"
    const h1 = hashRandom(idx * 7 + 13)
    const h2 = hashRandom(idx * 11 + 31)
    const packetIntegrity = Math.round(85 + h1 * 14)
    let syncState = "Synchronized"
    if (tq < 60) syncState = "Partial"
    if (tq < 30) syncState = "Lagging"
    const responseLatency = Math.round(8 + h2 * 35)

    return {
      id: d.id,
      nodeType: d.nodeType,
      label: d.label,
      status: determineStatus(health, lastHeartbeat, lastTelemetry),
      x: pos.x,
      y: pos.y,
      capabilities: d.capabilities,
      metadata: d.metadata,
      lastHeartbeat,
      lastTelemetry,
      telemetryQuality: tq,
      uptime: 0,
      health,
      packetIntegrity,
      syncState,
      responseLatency,
      telemetryLoad,
    }
  })

  const nodeObjById = new Map(nodes.map((n) => [n.id, n]))

  const links: SignalLink[] = []

  function mkLink(
    srcId: string, tgtId: string,
    type: SignalLink["type"], q: number, seed: number,
  ): void {
    const src = nodeObjById.get(srcId)
    const tgt = nodeObjById.get(tgtId)
    if (!src || !tgt) return
    const active = src.status !== "offline" && tgt.status !== "offline"
    const quality = active ? Math.min(98, q) : Math.max(10, q - 30)
    const cs = computeConnectionState({ active, quality }, src.status, tgt.status)
    const h = hashRandom(seed)
    links.push({
      id: `${srcId}->${tgtId}--${type}`,
      sourceId: srcId, targetId: tgtId, type,
      quality, active,
      latency: active ? Math.round(3 + h * 30) : 0,
      packetRate: active ? 0.3 + h * 0.6 : 0,
      connectionState: cs,
    })
  }

  // Physical → Capture
  mkLink("phy-esp32", "cap-poco", "telemetry", 88, 100)
  mkLink("phy-sensors", "cap-snapshots", "telemetry", 90, 110)
  mkLink("phy-actuators", "cap-snapshots", "telemetry", 82, 120)

  // Capture → Storage
  mkLink("cap-poco", "sto-supabase-storage", "telemetry", 92, 200)
  mkLink("cap-snapshots", "sto-supabase-db", "telemetry", 90, 210)

  // Storage → Reasoning (Processing)
  mkLink("sto-supabase-storage", "rea-processing", "telemetry", 94, 300)
  mkLink("sto-supabase-db", "rea-processing", "telemetry", 92, 310)

  // Processing → Reasoning engines
  mkLink("rea-processing", "rea-correlation", "event", 90, 400)
  mkLink("rea-processing", "rea-events", "event", 92, 410)
  mkLink("rea-processing", "rea-observations", "event", 88, 420)

  // Internal reasoning flow (row 1 → row 2)
  mkLink("rea-correlation", "rea-trends", "event", 86, 500)
  mkLink("rea-correlation", "rea-recommendations", "event", 84, 510)
  mkLink("rea-events", "rea-observations", "event", 90, 520)
  mkLink("rea-observations", "rea-trends", "event", 88, 530)
  mkLink("rea-observations", "rea-validation", "event", 86, 540)
  mkLink("rea-processing", "rea-knowledge", "event", 92, 550)
  mkLink("rea-knowledge", "rea-trends", "event", 88, 560)
  mkLink("rea-knowledge", "rea-recommendations", "event", 86, 570)
  mkLink("rea-knowledge", "rea-validation", "event", 84, 580)

  // Reasoning → Application
  mkLink("rea-trends", "app-dashboard", "event", 90, 600)
  mkLink("rea-trends", "app-analytics", "event", 88, 610)
  mkLink("rea-recommendations", "app-dashboard", "event", 86, 620)
  mkLink("rea-validation", "app-visual-intelligence", "event", 88, 630)
  mkLink("rea-validation", "app-dashboard", "event", 84, 640)
  mkLink("rea-knowledge", "app-visual-intelligence", "event", 90, 650)
  mkLink("rea-knowledge", "app-analytics", "event", 86, 660)

  // Build layer info
  const layerNodeIds = LAYER_DEFS.map((l) => l.nodePositions.map((np) => np.id))
  const layers: LayerInfo[] = LAYER_DEFS.map((l, i) => ({
    id: l.id,
    label: l.label,
    x: 0,
    y: l.y,
    width: 800,
    height: l.h,
    color: l.color,
    nodeIds: layerNodeIds[i],
  }))

  return { nodes, links, layers }
}

export function findNodeById(graph: TopologyGraph, id: string): TopologyNode | undefined {
  return graph.nodes.find((n) => n.id === id)
}

export function findLinksForNode(graph: TopologyGraph, nodeId: string): SignalLink[] {
  return graph.links.filter((l) => l.sourceId === nodeId || l.targetId === nodeId)
}
