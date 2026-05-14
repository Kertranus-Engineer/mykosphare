import type { TopologyNode, SignalLink, TopologyGraph } from "./types"
import type { NodeType, NodeStatus, DeviceCapability } from "./node-types"
import { getNodeTypeMeta } from "./node-types"

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
  if (nodeType === "cloud") return "online"
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

function computeLayerPositions(
  defs: NodeDef[],
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const { centerX, centerY, canvasWidth, canvasHeight } = config

  const byType = new Map<NodeType, NodeDef[]>()
  for (const d of defs) {
    const arr = byType.get(d.nodeType) ?? []
    arr.push(d)
    byType.set(d.nodeType, arr)
  }

  for (const d of defs) {
    const meta = getNodeTypeMeta(d.nodeType)
    const idx = (byType.get(d.nodeType) ?? []).indexOf(d)
    const count = (byType.get(d.nodeType) ?? []).length

    let x = centerX
    let y = centerY

    switch (d.nodeType) {
      case "cloud":
        x = centerX
        y = 48
        break
      case "chamber":
        x = centerX
        y = centerY
        break
      case "esp32": {
        const angle = (idx / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2
        const radius = 90
        x = centerX + Math.cos(angle) * radius
        y = centerY + Math.sin(angle) * radius
        break
      }
      case "sensor": {
        const angle = (idx / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2
        const radius = 165
        x = centerX + Math.cos(angle) * radius
        y = centerY + Math.sin(angle) * radius
        break
      }
      case "relay": {
        const angle = (idx / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2 + 0.3
        const radius = 140
        x = centerX + Math.cos(angle) * radius
        y = centerY + Math.sin(angle) * radius
        break
      }
      case "camera":
        x = canvasWidth - 80
        y = centerY - 40
        break
      case "power":
        x = centerX - 30
        y = canvasHeight - 56
        break
      case "simulator":
        x = centerX + 30
        y = canvasHeight - 56
        break
    }

    positions.set(d.id, { x, y })
  }

  return positions
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
    canvasWidth: config?.canvasWidth ?? 640,
    canvasHeight: config?.canvasHeight ?? 480,
    centerX: config?.centerX ?? 320,
    centerY: config?.centerY ?? 220,
  }

  const positions = computeLayerPositions(nodeDefs, layout)

  const nodes: TopologyNode[] = nodeDefs.map((d) => {
    const pos = positions.get(d.id) ?? { x: layout.centerX, y: layout.centerY }
    const health = deviceHealthMap.get(d.id) ?? 100
    const lastHeartbeat = heartbeatMap.get(d.id) ?? null
    const lastTelemetry = telemetryMap.get(d.id) ?? null
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
      telemetryQuality: computeTelemetryQuality(lastTelemetry),
      uptime: 0,
      health,
    }
  })

  const links: SignalLink[] = []
  const cloud = nodes.find((n) => n.nodeType === "cloud")
  const chamber = nodes.find((n) => n.nodeType === "chamber")
  const esp32s = nodes.filter((n) => n.nodeType === "esp32")
  const sensors = nodes.filter((n) => n.nodeType === "sensor")
  const relays = nodes.filter((n) => n.nodeType === "relay")

  if (cloud && chamber) {
    links.push({
      id: "cloud-chamber",
      sourceId: cloud.id,
      targetId: chamber.id,
      type: "telemetry",
      quality: 95,
      active: true,
      latency: latencyMap.get("cloud-chamber") ?? 45,
      packetRate: 0.4,
    })
  }

  for (const esp of esp32s) {
    if (chamber) {
      links.push({
        id: `chamber-${esp.id}`,
        sourceId: chamber.id,
        targetId: esp.id,
        type: "control",
        quality: 90,
        active: esp.status === "online",
        latency: latencyMap.get(`chamber-${esp.id}`) ?? 5,
        packetRate: 1,
      })
    }
  }

  for (const sensor of sensors) {
    const parentEsp = esp32s.length > 0 ? esp32s[sensor.id.charCodeAt(sensor.id.length - 1) % esp32s.length] : null
    if (parentEsp) {
      links.push({
        id: `${parentEsp.id}-${sensor.id}`,
        sourceId: parentEsp.id,
        targetId: sensor.id,
        type: "telemetry",
        quality: 85,
        active: sensor.status === "online",
        latency: latencyMap.get(`${parentEsp.id}-${sensor.id}`) ?? 10,
        packetRate: 0.4,
      })
    }
  }

  for (const relay of relays) {
    const parentEsp = esp32s.length > 0 ? esp32s[relay.id.charCodeAt(relay.id.length - 1) % esp32s.length] : null
    if (parentEsp) {
      links.push({
        id: `${parentEsp.id}-${relay.id}`,
        sourceId: parentEsp.id,
        targetId: relay.id,
        type: "control",
        quality: 88,
        active: relay.status === "online",
        latency: latencyMap.get(`${parentEsp.id}-${relay.id}`) ?? 8,
        packetRate: 0.2,
      })
    }
  }

  return { nodes, links }
}

export function findNodeById(graph: TopologyGraph, id: string): TopologyNode | undefined {
  return graph.nodes.find((n) => n.id === id)
}

export function findLinksForNode(graph: TopologyGraph, nodeId: string): SignalLink[] {
  return graph.links.filter((l) => l.sourceId === nodeId || l.targetId === nodeId)
}
