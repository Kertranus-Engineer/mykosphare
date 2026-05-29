import type { NodeType, NodeStatus, DeviceCapability } from "./node-types"

export type { NodeType, NodeStatus, DeviceCapability }

export type ConnectionState = "nominal" | "warning" | "critical" | "offline"

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
  packetIntegrity: number
  syncState: string
  responseLatency: number
  telemetryLoad: string
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
  connectionState: ConnectionState
}

export interface ZoneLabel {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface TopologyGraph {
  nodes: TopologyNode[]
  links: SignalLink[]
  zones?: ZoneLabel[]
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
