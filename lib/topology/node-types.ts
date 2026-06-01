export type NodeType =
  | "esp32" | "sensor" | "relay"
  | "poco-c75" | "snapshot"
  | "supabase-storage" | "supabase-db"
  | "capture-processing" | "correlation-engine" | "event-engine" | "observation-engine"
  | "trend-engine" | "recommendation-engine" | "validation" | "knowledge"
  | "visual-intelligence" | "dashboard" | "analytics"
  | "chamber" | "camera" | "power" | "cloud" | "simulator"
  | "sensor-mesh" | "co2-sensor" | "temp-sensor" | "humidity-sensor" | "airflow-sensor"
  | "relay-controller" | "ventilation-controller" | "humidity-actuator" | "thermal-regulator"
  | "ai-inference" | "predictive" | "broker" | "correlator"
  | "edge-compute" | "archive" | "failover" | "recovery"
  | "remote-sync"

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
  // ── PHYSICAL LAYER ──
  esp32: {
    nodeType: "esp32", label: "ESP32", icon: "cpu", layer: 0,
    description: "Edge microcontroller",
  },
  sensor: {
    nodeType: "sensor", label: "Sensor", icon: "activity", layer: 0,
    description: "Environmental sensor",
  },
  relay: {
    nodeType: "relay", label: "Relay", icon: "zap", layer: 0,
    description: "Actuator controller",
  },

  // ── CAPTURE LAYER ──
  "poco-c75": {
    nodeType: "poco-c75", label: "Poco C75", icon: "smartphone", layer: 1,
    description: "Smartphone capture device",
  },
  snapshot: {
    nodeType: "snapshot", label: "Snapshots", icon: "image", layer: 1,
    description: "Snapshot store",
  },

  // ── STORAGE LAYER ──
  "supabase-storage": {
    nodeType: "supabase-storage", label: "Supabase Storage", icon: "hard-drive", layer: 2,
    description: "Supabase file storage",
  },
  "supabase-db": {
    nodeType: "supabase-db", label: "Supabase DB", icon: "database", layer: 2,
    description: "Supabase database",
  },

  // ── REASONING LAYER ──
  "capture-processing": {
    nodeType: "capture-processing", label: "Processing", icon: "cpu", layer: 3,
    description: "Capture processing engine",
  },
  "correlation-engine": {
    nodeType: "correlation-engine", label: "Correlation", icon: "git-branch", layer: 3,
    description: "Event correlation engine",
  },
  "event-engine": {
    nodeType: "event-engine", label: "Events", icon: "zap", layer: 3,
    description: "Event processing engine",
  },
  "observation-engine": {
    nodeType: "observation-engine", label: "Observations", icon: "eye", layer: 3,
    description: "Observation engine",
  },
  "trend-engine": {
    nodeType: "trend-engine", label: "Trends", icon: "trending-up", layer: 3,
    description: "Trend analysis engine",
  },
  "recommendation-engine": {
    nodeType: "recommendation-engine", label: "Recommendations", icon: "lightbulb", layer: 3,
    description: "Recommendation engine",
  },
  validation: {
    nodeType: "validation", label: "Validation", icon: "check-circle", layer: 3,
    description: "Validation engine",
  },
  knowledge: {
    nodeType: "knowledge", label: "Knowledge", icon: "book-open", layer: 3,
    description: "Knowledge layer",
  },

  // ── APPLICATION LAYER ──
  "visual-intelligence": {
    nodeType: "visual-intelligence", label: "Visual Intelligence", icon: "camera", layer: 4,
    description: "Visual intelligence engine",
  },
  dashboard: {
    nodeType: "dashboard", label: "Dashboard", icon: "layout-dashboard", layer: 4,
    description: "Operations dashboard",
  },
  analytics: {
    nodeType: "analytics", label: "Analytics", icon: "bar-chart-2", layer: 4,
    description: "Analytics engine",
  },

  // ── LEGACY (kept for backward compatibility) ──
  chamber: {
    nodeType: "chamber", label: "Chamber", icon: "box", layer: -1,
    description: "Primary environmental chamber",
  },
  camera: {
    nodeType: "camera", label: "Camera", icon: "camera", layer: -1,
    description: "Visual monitoring",
  },
  power: {
    nodeType: "power", label: "Power", icon: "battery", layer: -1,
    description: "Power management",
  },
  cloud: {
    nodeType: "cloud", label: "Cloud", icon: "cloud", layer: -1,
    description: "Cloud ingestion",
  },
  simulator: {
    nodeType: "simulator", label: "Simulator", icon: "terminal", layer: -1,
    description: "Local simulation",
  },
  "sensor-mesh": {
    nodeType: "sensor-mesh", label: "Sensor Mesh", icon: "network", layer: -1,
    description: "Distributed sensor mesh gateway",
  },
  "co2-sensor": {
    nodeType: "co2-sensor", label: "CO₂", icon: "wind", layer: -1,
    description: "CO₂ concentration sensor",
  },
  "temp-sensor": {
    nodeType: "temp-sensor", label: "Temp", icon: "thermometer", layer: -1,
    description: "Temperature sensor",
  },
  "humidity-sensor": {
    nodeType: "humidity-sensor", label: "Humidity", icon: "droplets", layer: -1,
    description: "Humidity sensor",
  },
  "airflow-sensor": {
    nodeType: "airflow-sensor", label: "Airflow", icon: "gauge", layer: -1,
    description: "Airflow rate sensor",
  },
  "relay-controller": {
    nodeType: "relay-controller", label: "Relay Ctrl", icon: "toggle-left", layer: -1,
    description: "General relay controller",
  },
  "ventilation-controller": {
    nodeType: "ventilation-controller", label: "Ventilation", icon: "fan", layer: -1,
    description: "Ventilation system controller",
  },
  "humidity-actuator": {
    nodeType: "humidity-actuator", label: "Humidifier", icon: "sprout", layer: -1,
    description: "Humidity actuator module",
  },
  "thermal-regulator": {
    nodeType: "thermal-regulator", label: "Thermal", icon: "flame", layer: -1,
    description: "Thermal regulation system",
  },
  "ai-inference": {
    nodeType: "ai-inference", label: "AI Inference", icon: "brain", layer: -1,
    description: "AI inference engine",
  },
  predictive: {
    nodeType: "predictive", label: "Predictive", icon: "trending-up", layer: -1,
    description: "Predictive analytics engine",
  },
  broker: {
    nodeType: "broker", label: "Broker", icon: "radio", layer: -1,
    description: "Telemetry message broker",
  },
  correlator: {
    nodeType: "correlator", label: "Correlator", icon: "git-branch", layer: -1,
    description: "Event correlation engine",
  },
  "edge-compute": {
    nodeType: "edge-compute", label: "Edge Compute", icon: "microchip", layer: -1,
    description: "Edge computing node",
  },
  archive: {
    nodeType: "archive", label: "Archive", icon: "database", layer: -1,
    description: "Long-term data archive",
  },
  failover: {
    nodeType: "failover", label: "Failover", icon: "shield", layer: -1,
    description: "Automatic failover node",
  },
  recovery: {
    nodeType: "recovery", label: "Recovery", icon: "refresh-cw", layer: -1,
    description: "System recovery engine",
  },
  "remote-sync": {
    nodeType: "remote-sync", label: "Remote Sync", icon: "upload-cloud", layer: -1,
    description: "Remote synchronization gateway",
  },
}

export function getNodeTypeMeta(nodeType: NodeType): Omit<NodeMeta, "capabilities"> {
  return NODE_TYPE_META[nodeType]
}
