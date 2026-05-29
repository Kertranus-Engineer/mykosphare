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

function computeConnectionState(
  link: { active: boolean; quality: number },
  sourceStatus: NodeStatus,
  targetStatus: NodeStatus
): ConnectionState {
  if (!link.active || sourceStatus === "offline" || targetStatus === "offline") return "offline"
  if (link.quality < 50) return "critical"
  if (link.quality < 75 || sourceStatus === "degraded" || targetStatus === "degraded") return "warning"
  return "nominal"
}

function placeOnLine(
  ids: string[],
  x1: number, y1: number,
  x2: number, y2: number
): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>()
  const n = ids.length
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    m.set(ids[i], {
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t,
    })
  }
  return m
}

// Pre-computed deterministic "random" using hash for SSR safety
function hashRandom(seed: number): number {
  const s = (seed * 16807) % 2147483647
  return (s - 1) / 2147483646
}

export function getNodeRadius(nodeType: NodeType): number {
  switch (nodeType) {
    case "chamber": return 28
    case "cloud": case "remote-sync": case "analytics": return 14
    case "ai-inference": case "predictive": case "broker": case "correlator": return 13
    case "esp32": case "edge-compute": return 11
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

  const { centerX, centerY, canvasWidth } = layout
  const margin = 50
  const usableW = canvasWidth - margin * 2
  const left = margin
  const right = canvasWidth - margin

  const positions = new Map<string, { x: number; y: number }>()

  // Collect node IDs by category
  const cloudIds = nodeDefs.filter((d) => d.nodeType === "cloud").map((d) => d.id)
  const remoteSyncIds = nodeDefs.filter((d) => d.nodeType === "remote-sync").map((d) => d.id)
  const analyticsIds = nodeDefs.filter((d) => d.nodeType === "analytics").map((d) => d.id)
  const aiIds = nodeDefs.filter((d) => d.nodeType === "ai-inference").map((d) => d.id)
  const predictiveIds = nodeDefs.filter((d) => d.nodeType === "predictive").map((d) => d.id)
  const brokerIds = nodeDefs.filter((d) => d.nodeType === "broker").map((d) => d.id)
  const correlatorIds = nodeDefs.filter((d) => d.nodeType === "correlator").map((d) => d.id)
  const chamberIds = nodeDefs.filter((d) => d.nodeType === "chamber").map((d) => d.id)
  const esp32Ids = nodeDefs.filter((d) => d.nodeType === "esp32").map((d) => d.id)
  const sensorIds = nodeDefs.filter((d) =>
    d.nodeType === "sensor" || d.nodeType === "sensor-mesh" ||
    d.nodeType === "co2-sensor" || d.nodeType === "temp-sensor" ||
    d.nodeType === "humidity-sensor" || d.nodeType === "airflow-sensor"
  ).map((d) => d.id)
  const relayIds = nodeDefs.filter((d) =>
    d.nodeType === "relay" || d.nodeType === "relay-controller" ||
    d.nodeType === "ventilation-controller" || d.nodeType === "humidity-actuator" ||
    d.nodeType === "thermal-regulator"
  ).map((d) => d.id)
  const cameraIds = nodeDefs.filter((d) => d.nodeType === "camera").map((d) => d.id)
  const powerIds = nodeDefs.filter((d) => d.nodeType === "power").map((d) => d.id)
  const infraIds = nodeDefs.filter((d) =>
    d.nodeType === "edge-compute" || d.nodeType === "archive" ||
    d.nodeType === "failover" || d.nodeType === "recovery"
  ).map((d) => d.id)
  const archiveIds = nodeDefs.filter((d) => d.nodeType === "archive").map((d) => d.id)
  const failoverIds = nodeDefs.filter((d) => d.nodeType === "failover").map((d) => d.id)
  const recoveryIds = nodeDefs.filter((d) => d.nodeType === "recovery").map((d) => d.id)
  const simulatorIds = nodeDefs.filter((d) => d.nodeType === "simulator").map((d) => d.id)

  // ── VERTICAL LAYERED ARCHITECTURE ────────────
  // Each layer spans 70% of width, centered, with clear vertical spacing

  // --- CLOUD LAYER (top) --- y = 55
  {
    const y = 55
    const ids = [remoteSyncIds[0], cloudIds[0], analyticsIds[0]].filter(Boolean)
    const m = placeOnLine(ids, centerX - usableW * 0.25, y, centerX + usableW * 0.25, y)
    for (const [id, pos] of m) positions.set(id, pos)
  }

  // --- INTELLIGENCE LAYER --- y = 140
  {
    const y = 140
    const ids = [...aiIds, ...predictiveIds, ...brokerIds, ...correlatorIds]
    const m = placeOnLine(ids, centerX - usableW * 0.35, y, centerX + usableW * 0.35, y)
    for (const [id, pos] of m) positions.set(id, pos)
  }

  // --- CHAMBER (true center) --- y = 280
  for (const id of chamberIds) {
    positions.set(id, { x: centerX, y: centerY })
  }

  // --- CONTROL FABRIC --- y = 360, ring around chamber
  {
    const r = 110
    const n = relayIds.length
    for (let i = 0; i < n; i++) {
      const angle = (-Math.PI * 0.35) + (i / Math.max(n - 1, 1)) * (Math.PI * 0.7)
      positions.set(relayIds[i], {
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r + 70,
      })
    }
  }

  // --- EDGE NETWORK (sensors) --- y = 430
  {
    const y = 430
    const ids = [...sensorIds]
    const m = placeOnLine(ids, left + 20, y, right - 20, y)
    for (const [id, pos] of m) positions.set(id, pos)
  }

  // --- ESP32 --- between chamber and sensors
  if (esp32Ids.length > 0) {
    const angle = Math.PI * 0.8
    const r = 90
    positions.set(esp32Ids[0], {
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r + 50,
    })
  }

  // --- INFRASTRUCTURE --- y = 510
  {
    const y = 510
    const ids = [...powerIds, ...simulatorIds, ...infraIds, ...cameraIds]
    const m = placeOnLine(ids, left + 10, y, right - 10, y)
    for (const [id, pos] of m) positions.set(id, pos)
  }

  // ── Build nodes ──
  const nodes: TopologyNode[] = nodeDefs.map((d, idx) => {
    const pos = positions.get(d.id) ?? { x: centerX, y: centerY }
    const health = deviceHealthMap.get(d.id) ?? 100
    const lastHeartbeat = heartbeatMap.get(d.id) ?? null
    const lastTelemetry = telemetryMap.get(d.id) ?? null
    const tq = computeTelemetryQuality(lastTelemetry)
    const telemetryLoad = tq >= 85 ? "Low" : tq >= 60 ? "Moderate" : tq >= 30 ? "Elevated" : "Critical"

    // Deterministic pseudo-random from hash (SSR safe)
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

  // ── Build links (intentional, structured, minimal) ──
  const links: SignalLink[] = []
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  function mkLink(srcId: string, tgtId: string, type: SignalLink["type"], q: number, seed: number): void {
    const src = nodeById.get(srcId)
    const tgt = nodeById.get(tgtId)
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

  // Chamber is the hub — all flows converge through it
  const chId = chamberIds[0]
  if (chId) {
    // Cloud → Chamber
    for (const cid of cloudIds) mkLink(cid, chId, "telemetry", 95, 100)
    for (const rid of remoteSyncIds) mkLink(rid, chId, "telemetry", 92, 101)
    // Intelligence → Chamber (bidirectional)
    for (const iid of [...aiIds, ...predictiveIds, ...brokerIds, ...correlatorIds]) {
      mkLink(iid, chId, "telemetry", 90, 200 + iid.charCodeAt(1))
    }
    // Chamber → Control
    for (const rid of relayIds) mkLink(chId, rid, "control", 85, 300 + rid.charCodeAt(2))
    // Chamber → ESP32 (if any)
    for (const eid of esp32Ids) mkLink(chId, eid, "control", 88, 400)
    // Chamber → Infrastructure
    for (const iid of [...infraIds, ...powerIds, ...simulatorIds]) {
      mkLink(chId, iid, "heartbeat", 86, 500 + iid.charCodeAt(0))
    }
  }

  // Cloud → Intelligence
  for (const cid of [...cloudIds, ...analyticsIds]) {
    for (const iid of [...aiIds, ...predictiveIds]) {
      mkLink(cid, iid, "telemetry", 93, 600)
    }
  }

  // ESP32 → Sensors (telemetry uplink)
  for (const eid of esp32Ids) {
    for (const sid of sensorIds) {
      mkLink(eid, sid, "telemetry", 82, 700 + sid.charCodeAt(0))
    }
  }

  // AI → Predictive
  for (const aid of aiIds) {
    for (const pid of predictiveIds) {
      mkLink(aid, pid, "event", 94, 800)
    }
  }

  // Broker → Correlator
  for (const bid of brokerIds) {
    for (const cid of correlatorIds) {
      mkLink(bid, cid, "event", 91, 900)
    }
  }

  // Remote Sync → Analytics
  for (const rid of remoteSyncIds) {
    for (const aid of analyticsIds) {
      mkLink(rid, aid, "telemetry", 94, 1000)
    }
  }

  // Archive ↔ Failover
  for (const aid of archiveIds) {
    for (const fid of failoverIds) {
      mkLink(aid, fid, "heartbeat", 87, 1100)
    }
  }

  // Recovery → Chamber
  for (const rid of recoveryIds) {
    if (chId) mkLink(rid, chId, "control", 80, 1200)
  }

  // ── Zone labels ──
  const zones: ZoneLabel[] = [
    { id: "zone-cloud", label: "REMOTE ORCHESTRATION", x: centerX - 100, y: 25, width: 200, height: 20 },
    { id: "zone-intel", label: "INTELLIGENCE LAYER", x: centerX - 80, y: 110, width: 160, height: 20 },
    { id: "zone-control", label: "CONTROL FABRIC", x: centerX + 60, y: 370, width: 130, height: 20 },
    { id: "zone-edge", label: "EDGE NETWORK", x: centerX - 80, y: 400, width: 160, height: 20 },
    { id: "zone-infra", label: "INFRASTRUCTURE", x: centerX - 70, y: 480, width: 140, height: 20 },
  ]

  return { nodes, links, zones }
}

export function findNodeById(graph: TopologyGraph, id: string): TopologyNode | undefined {
  return graph.nodes.find((n) => n.id === id)
}

export function findLinksForNode(graph: TopologyGraph, nodeId: string): SignalLink[] {
  return graph.links.filter((l) => l.sourceId === nodeId || l.targetId === nodeId)
}
