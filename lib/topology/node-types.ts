export type NodeType =
  | "chamber" | "esp32" | "sensor" | "relay" | "camera" | "power" | "cloud" | "simulator"
  | "sensor-mesh" | "co2-sensor" | "temp-sensor" | "humidity-sensor" | "airflow-sensor"
  | "relay-controller" | "ventilation-controller" | "humidity-actuator" | "thermal-regulator"
  | "ai-inference" | "predictive" | "broker" | "correlator"
  | "edge-compute" | "archive" | "failover" | "recovery"
  | "remote-sync" | "analytics"

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
    nodeType: "chamber", label: "Chamber", icon: "box", layer: 0,
    description: "Primary environmental chamber",
  },
  esp32: {
    nodeType: "esp32", label: "ESP32", icon: "cpu", layer: 1,
    description: "Edge microcontroller",
  },
  sensor: {
    nodeType: "sensor", label: "Sensor", icon: "activity", layer: 2,
    description: "Environmental sensor",
  },
  relay: {
    nodeType: "relay", label: "Relay", icon: "zap", layer: 2,
    description: "Actuator controller",
  },
  camera: {
    nodeType: "camera", label: "Camera", icon: "camera", layer: 2,
    description: "Visual monitoring",
  },
  power: {
    nodeType: "power", label: "Power", icon: "battery", layer: 3,
    description: "Power management",
  },
  cloud: {
    nodeType: "cloud", label: "Cloud", icon: "cloud", layer: -1,
    description: "Cloud ingestion",
  },
  simulator: {
    nodeType: "simulator", label: "Simulator", icon: "terminal", layer: 3,
    description: "Local simulation",
  },
  "sensor-mesh": {
    nodeType: "sensor-mesh", label: "Sensor Mesh", icon: "network", layer: 2,
    description: "Distributed sensor mesh gateway",
  },
  "co2-sensor": {
    nodeType: "co2-sensor", label: "CO₂", icon: "wind", layer: 2,
    description: "CO₂ concentration sensor",
  },
  "temp-sensor": {
    nodeType: "temp-sensor", label: "Temp", icon: "thermometer", layer: 2,
    description: "Temperature sensor",
  },
  "humidity-sensor": {
    nodeType: "humidity-sensor", label: "Humidity", icon: "droplets", layer: 2,
    description: "Humidity sensor",
  },
  "airflow-sensor": {
    nodeType: "airflow-sensor", label: "Airflow", icon: "gauge", layer: 2,
    description: "Airflow rate sensor",
  },
  "relay-controller": {
    nodeType: "relay-controller", label: "Relay Ctrl", icon: "toggle-left", layer: 2,
    description: "General relay controller",
  },
  "ventilation-controller": {
    nodeType: "ventilation-controller", label: "Ventilation", icon: "fan", layer: 2,
    description: "Ventilation system controller",
  },
  "humidity-actuator": {
    nodeType: "humidity-actuator", label: "Humidifier", icon: "sprout", layer: 2,
    description: "Humidity actuator module",
  },
  "thermal-regulator": {
    nodeType: "thermal-regulator", label: "Thermal", icon: "flame", layer: 2,
    description: "Thermal regulation system",
  },
  "ai-inference": {
    nodeType: "ai-inference", label: "AI Inference", icon: "brain", layer: 1,
    description: "AI inference engine",
  },
  predictive: {
    nodeType: "predictive", label: "Predictive", icon: "trending-up", layer: 1,
    description: "Predictive analytics engine",
  },
  broker: {
    nodeType: "broker", label: "Broker", icon: "radio", layer: 1,
    description: "Telemetry message broker",
  },
  correlator: {
    nodeType: "correlator", label: "Correlator", icon: "git-branch", layer: 1,
    description: "Event correlation engine",
  },
  "edge-compute": {
    nodeType: "edge-compute", label: "Edge Compute", icon: "microchip", layer: 1,
    description: "Edge computing node",
  },
  archive: {
    nodeType: "archive", label: "Archive", icon: "database", layer: 2,
    description: "Long-term data archive",
  },
  failover: {
    nodeType: "failover", label: "Failover", icon: "shield", layer: 2,
    description: "Automatic failover node",
  },
  recovery: {
    nodeType: "recovery", label: "Recovery", icon: "refresh-cw", layer: 2,
    description: "System recovery engine",
  },
  "remote-sync": {
    nodeType: "remote-sync", label: "Remote Sync", icon: "upload-cloud", layer: -1,
    description: "Remote synchronization gateway",
  },
  analytics: {
    nodeType: "analytics", label: "Analytics", icon: "bar-chart-2", layer: -1,
    description: "Analytics processing cluster",
  },
}

export function getNodeTypeMeta(nodeType: NodeType): Omit<NodeMeta, "capabilities"> {
  return NODE_TYPE_META[nodeType]
}
