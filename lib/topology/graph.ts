import type { TopologyNode, SignalLink, TopologyGraph, ZoneLabel, ConnectionState } from "./types"
import type { NodeType, NodeStatus, DeviceCapability } from "./node-types"

interface NodeDef {
  id: string
  nodeType: NodeType
  label: string
  capabilities: DeviceCapability[]
  metadata: Record<string, string | number | boolean | null>
}

interface LayoutConfig {
  canvasWidth: number
  canvasHeight: number
  centerX: number
  centerY: number
}

function determineStatus(
  health: number,
  lastHeartbeat: string | null,
  lastTelemetry: string | null,
  nodeType: NodeType
): NodeStatus {
  if (nodeType === "cloud" || nodeType === "remote-sync" || nodeType === "analytics") return "online"
  if (nodeType === "chamber") return "online"
  if (!lastHeartbeat && !lastTelemetry && nodeType !== "simulator") return "standby"
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

function computeConnectionState(link: { active: boolean; quality: number }, sourceStatus: NodeStatus, targetStatus: NodeStatus): ConnectionState {
  if (!link.active || sourceStatus === "offline" || targetStatus === "offline") return "offline"
  if (link.quality < 50) return "critical"
  if (link.quality < 75 || sourceStatus === "degraded" || targetStatus === "degraded") return "warning"
  return "nominal"
}

function placeOnLine(ids: string[], x1: number, y1: number, x2: number, y2: number): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>()
  const n = ids.length
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    m.set(ids[i], { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t })
  }
  return m
}

function hashRandom(seed: number): number {
  const s = (seed * 16807) % 2147483647
  return (s - 1) / 2147483646
}

export function getNodeRadius(nodeType: NodeType): number {
  switch (nodeType) {
    case "chamber": return 28
    case "cloud": case "remote-sync": case "analytics": return 16
    case "ai-inference": case "predictive": case "broker": case "correlator": return 15
    case "esp32": case "edge-compute": return 14
    case "archive": case "failover": case "recovery": return 10
    case "power": case "simulator": return 9
    default: return 8
  }
}

export function getNodeLabelSize(nodeType: NodeType): number {
  if (nodeType === "chamber") return 11
  if (nodeType === "cloud" || nodeType === "ai-inference" || nodeType === "predictive") return 8
  return 7
}

export function buildTopologyGraph(
  nodeDefs: NodeDef[],
  deviceHealthMap: Map<string, number>,
  heartbeatMap: Map<string, string>,
  telemetryMap: Map<string, string>,
  latencyMap: Map<string, number>,
  config?: Partial<LayoutConfig>
): TopologyGraph {
  const layout: LayoutConfig = {
    canvasWidth: config?.canvasWidth ?? 800,
    canvasHeight: config?.canvasHeight ?? 560,
    centerX: config?.centerX ?? 400,
    centerY: config?.centerY ?? 280,
  }

  const { centerX, centerY, canvasWidth, canvasHeight } = layout
  const margin = 50
  const usableW = canvasWidth - margin * 2
  const left = margin
  const right = canvasWidth - margin
  const top = margin
  const bottom = canvasHeight - margin

  const positions = new Map<string, { x: number; y: number }>()
  const nodeById = new Map(nodeDefs.map((d) => [d.id, d]))

  // ── LINEAR LEFT-TO-RIGHT FLOW LAYOUT ─────────
  //   Sensors (left) → ESP32 → Backbone → Intelligence → Actuators (right)
  //
  //     Zone A ─┐
  //     Zone B ──┤→ ESP32 Gateway → Telemetry Backbone → Intelligence Engine → Ventilation Fan
  //     Zone C ─┘                                                    → Humidifier
  //                                                                   → Alert Engine

  // Col 1: SENSORS (left) — x = 120, vertical stack
  {
    const sensorIds = nodeDefs.filter((d) =>
      d.nodeType === "chamber" || d.nodeType === "sensor" || d.nodeType === "sensor-mesh" ||
      d.nodeType === "temp-sensor" || d.nodeType === "humidity-sensor" || d.nodeType === "co2-sensor"
    ).map((d) => d.id)
    const yStart = top + 60
    const yEnd = bottom - 60
    sensorIds.forEach((id, i) => {
      const t = sensorIds.length > 1 ? i / (sensorIds.length - 1) : 0.5
      positions.set(id, { x: 130, y: yStart + (yEnd - yStart) * t })
    })
  }

  // Col 2: ESP32 GATEWAY — x = 290, center
  {
    const espIds = nodeDefs.filter((d) => d.nodeType === "esp32").map((d) => d.id)
    espIds.forEach((id) => positions.set(id, { x: 290, y: centerY }))
  }

  // Col 3: TELEMETRY BACKBONE — x = 440
  {
    const backboneIds = nodeDefs.filter((d) =>
      d.nodeType === "cloud" || d.nodeType === "remote-sync" || d.nodeType === "analytics" ||
      d.nodeType === "broker"
    ).map((d) => d.id)
    backboneIds.forEach((id, i) => {
      const t = backboneIds.length > 1 ? i / (backboneIds.length - 1) : 0.5
      positions.set(id, { x: 440, y: top + 100 + (bottom - top - 200) * t })
    })
  }

  // Col 4: INTELLIGENCE LAYER — x = 560
  {
    const intelIds = nodeDefs.filter((d) =>
      d.nodeType === "ai-inference" || d.nodeType === "predictive" || d.nodeType === "correlator"
    ).map((d) => d.id)
    intelIds.forEach((id, i) => {
      const t = intelIds.length > 1 ? i / (intelIds.length - 1) : 0.5
      positions.set(id, { x: 560, y: top + 80 + (bottom - top - 160) * t })
    })
  }

  // Col 5: ACTUATORS — x = 680, vertical stack
  {
    const actuatorIds = nodeDefs.filter((d) =>
      d.nodeType === "relay" || d.nodeType === "relay-controller" ||
      d.nodeType === "ventilation-controller" || d.nodeType === "humidity-actuator" ||
      d.nodeType === "thermal-regulator"
    ).map((d) => d.id)
    const yStart = top + 80
    const yEnd = bottom - 80
    actuatorIds.forEach((id, i) => {
      const t = actuatorIds.length > 1 ? i / (actuatorIds.length - 1) : 0.5
      positions.set(id, { x: 680, y: yStart + (yEnd - yStart) * t })
    })
  }

  // Other infrastructure — bottom area
  {
    const otherIds = nodeDefs.filter((d) =>
      d.nodeType === "power" || d.nodeType === "edge-compute" ||
      d.nodeType === "archive" || d.nodeType === "failover" || d.nodeType === "recovery" ||
      d.nodeType === "simulator" || d.nodeType === "camera"
    ).map((d) => d.id)
    otherIds.forEach((id, i) => {
      const t = otherIds.length > 1 ? i / (otherIds.length - 1) : 0.5
      positions.set(id, { x: 400 + (t - 0.5) * 300, y: bottom - 10 })
    })
  }

  // ── Build nodes ──
  const nodes: TopologyNode[] = nodeDefs.map((d, idx) => {
    const pos = positions.get(d.id) ?? { x: centerX, y: centerY }
    const health = deviceHealthMap.get(d.id) ?? 100
    const lastHeartbeat = heartbeatMap.get(d.id) ?? null
    const lastTelemetry = telemetryMap.get(d.id) ?? null
    const tq = computeTelemetryQuality(lastTelemetry)
    const telemetryLoad = tq >= 85 ? "Low" : tq >= 60 ? "Moderate" : tq >= 30 ? "Elevated" : "Critical"
    const h1 = hashRandom(idx * 7 + 13)
    const h2 = hashRandom(idx * 11 + 31)
    const packetIntegrity = d.nodeType === "chamber" ? 100 : Math.round(85 + h1 * 14)
    let syncState = "Synchronized"
    if (tq < 60) syncState = "Partial"
    if (tq < 30) syncState = "Lagging"
    const responseLatency = d.nodeType === "chamber" ? 5 : Math.round(8 + h2 * 35)

    return {
      id: d.id,
      nodeType: d.nodeType,
      label: d.label,
      status: determineStatus(health, lastHeartbeat, lastTelemetry, d.nodeType),
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

  // ── Build links (linear flow: Sensors → ESP32 → Backbone → Intelligence → Actuators) ──
  const links: SignalLink[] = []
  const nodeObjById = new Map(nodes.map((n) => [n.id, n]))

  function mkLink(srcId: string, tgtId: string, type: SignalLink["type"], q: number, seed: number): void {
    const src = nodeObjById.get(srcId)
    const tgt = nodeObjById.get(tgtId)
    if (!src || !tgt) return
    const active = src.status !== "offline" && tgt.status !== "offline"
    const quality = active ? Math.min(98, q) : Math.max(10, q - 30)
    const cs = computeConnectionState({ active, quality }, src.status, tgt.status)
    const h = hashRandom(seed)
    links.push({
      id: `${srcId}->${tgtId}`,
      sourceId: srcId, targetId: tgtId, type,
      quality, active,
      latency: active ? Math.round(3 + h * 30) : 0,
      packetRate: active ? 0.3 + h * 0.6 : 0,
      connectionState: cs,
    })
  }

  // Main flow: Sensors → ESP32
  const sensorNodeIds = nodes.filter((n) =>
    n.nodeType === "chamber" || n.nodeType === "temp-sensor" || n.nodeType === "humidity-sensor" || n.nodeType === "co2-sensor"
  ).map((n) => n.id)
  const espNodeIds = nodes.filter((n) => n.nodeType === "esp32").map((n) => n.id)
  for (const sid of sensorNodeIds) {
    for (const eid of espNodeIds) {
      mkLink(sid, eid, "telemetry", 85, 100 + sid.charCodeAt(0))
    }
  }

  // ESP32 → Backbone (cloud/analytics/broker)
  const backboneIds = nodes.filter((n) =>
    n.nodeType === "cloud" || n.nodeType === "analytics" || n.nodeType === "broker"
  ).map((n) => n.id)
  for (const eid of espNodeIds) {
    for (const bid of backboneIds) {
      mkLink(eid, bid, "telemetry", 90, 200 + bid.charCodeAt(0))
    }
  }

  // Backbone → Intelligence
  const intelIds = nodes.filter((n) => n.nodeType === "ai-inference" || n.nodeType === "predictive" || n.nodeType === "correlator").map((n) => n.id)
  for (const bid of backboneIds) {
    for (const iid of intelIds) {
      mkLink(bid, iid, "telemetry", 92, 300 + iid.charCodeAt(1))
    }
  }

  // Intelligence → Actuators
  const actIds = nodes.filter((n) =>
    n.nodeType === "relay" || n.nodeType === "relay-controller" ||
    n.nodeType === "ventilation-controller" || n.nodeType === "humidity-actuator"
  ).map((n) => n.id)
  for (const iid of intelIds) {
    for (const aid of actIds) {
      mkLink(iid, aid, "control", 85, 400 + aid.charCodeAt(2))
    }
  }

  // Backbone ↔ Intelligence (bidirectional analytics)
  const coreIntelIds = nodes.filter((n) => n.nodeType === "ai-inference" || n.nodeType === "predictive").map((n) => n.id)
  const coreBackboneIds = nodes.filter((n) => n.nodeType === "analytics").map((n) => n.id)
  for (const ci of coreIntelIds) {
    for (const cb of coreBackboneIds) {
      mkLink(cb, ci, "event", 94, 500)
      mkLink(ci, cb, "event", 94, 600)
    }
  }

  // ── Zone labels ──
  const zones: ZoneLabel[] = [
    { id: "zone-sensors", label: "ENVIRONMENTAL SENSORS", x: 30, y: 5, width: 130, height: 20 },
    { id: "zone-gateway", label: "ESP32 GATEWAY", x: 215, y: centerY - 40, width: 110, height: 20 },
    { id: "zone-backbone", label: "TELEMETRY BACKBONE", x: 370, y: 5, width: 120, height: 20 },
    { id: "zone-intel", label: "ANALYTICS ENGINE", x: 500, y: 5, width: 110, height: 20 },
    { id: "zone-actuators", label: "ACTUATOR NETWORK", x: 625, y: 5, width: 120, height: 20 },
  ]

  return { nodes, links, zones }
}

export function findNodeById(graph: TopologyGraph, id: string): TopologyNode | undefined {
  return graph.nodes.find((n) => n.id === id)
}

export function findLinksForNode(graph: TopologyGraph, nodeId: string): SignalLink[] {
  return graph.links.filter((l) => l.sourceId === nodeId || l.targetId === nodeId)
}
