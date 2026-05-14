export type NodeType = "chamber" | "esp32" | "sensor" | "relay" | "camera" | "power" | "cloud" | "simulator"

export type NodeStatus = "online" | "offline" | "degraded" | "warning" | "syncing" | "standby"

export interface DeviceCapability {
  type: string
  label: string
  unit?: string
  value?: number | string
}

export interface NodeMeta {
  nodeType: NodeType
  label: string
  icon: string
  layer: number
  capabilities: DeviceCapability[]
  description: string
}

export const NODE_TYPE_META: Record<NodeType, Omit<NodeMeta, "capabilities">> = {
  chamber: {
    nodeType: "chamber",
    label: "Chamber",
    icon: "box",
    layer: 0,
    description: "Primary environmental chamber",
  },
  esp32: {
    nodeType: "esp32",
    label: "ESP32",
    icon: "cpu",
    layer: 1,
    description: "Edge microcontroller",
  },
  sensor: {
    nodeType: "sensor",
    label: "Sensor",
    icon: "activity",
    layer: 2,
    description: "Environmental sensor",
  },
  relay: {
    nodeType: "relay",
    label: "Relay",
    icon: "zap",
    layer: 2,
    description: "Actuator controller",
  },
  camera: {
    nodeType: "camera",
    label: "Camera",
    icon: "camera",
    layer: 2,
    description: "Visual monitoring",
  },
  power: {
    nodeType: "power",
    label: "Power",
    icon: "battery",
    layer: 3,
    description: "Power management",
  },
  cloud: {
    nodeType: "cloud",
    label: "Cloud",
    icon: "cloud",
    layer: -1,
    description: "Cloud ingestion",
  },
  simulator: {
    nodeType: "simulator",
    label: "Simulator",
    icon: "terminal",
    layer: 3,
    description: "Local simulation",
  },
}

export function getNodeTypeMeta(nodeType: NodeType): Omit<NodeMeta, "capabilities"> {
  return NODE_TYPE_META[nodeType]
}
