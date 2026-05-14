import type { NodeType, NodeStatus, DeviceCapability } from "./node-types"

export type { NodeType, NodeStatus, DeviceCapability }

export interface TopologyNode {
  id: string
  nodeType: NodeType
  label: string
  status: NodeStatus
  x: number
  y: number
  capabilities: DeviceCapability[]
  metadata: Record<string, string | number | boolean | null>
  lastHeartbeat: string | null
  lastTelemetry: string | null
  telemetryQuality: number
  uptime: number
  health: number
}

export interface SignalLink {
  id: string
  sourceId: string
  targetId: string
  type: "telemetry" | "heartbeat" | "control" | "event"
  quality: number
  active: boolean
  latency: number
  packetRate: number
}

export interface TopologyGraph {
  nodes: TopologyNode[]
  links: SignalLink[]
}

export interface TopologyMetrics {
  totalNodes: number
  activeNodes: number
  offlineNodes: number
  degradedNodes: number
  warningNodes: number
  syncingNodes: number
  standbyNodes: number
  avgLatency: number
  totalPacketFlow: number
  uptimeQuality: number
  avgHealth: number
}

export interface SignalActivity {
  linkId: string
  timestamp: number
  type: "telemetry" | "heartbeat" | "control" | "event"
  strength: number
}

export interface TopologySnapshot {
  graph: TopologyGraph
  metrics: TopologyMetrics
  activities: SignalActivity[]
  generatedAt: number
}
