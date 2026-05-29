"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useRealtimeDevices, useRealtimeTelemetry } from "@/lib/realtime/subscriptions"
import { buildTopologyGraph } from "./graph"
import { computeTopologyMetrics } from "./metrics"
import { generateTelemetryActivity, generateHeartbeatActivity, pruneActivityHistory } from "./signal"
import type { SignalActivity, TopologyNode } from "./types"
import type { NodeType, DeviceCapability } from "./node-types"
import { getDeviceCapabilities, inferDeviceType } from "@/lib/protocol/identity"

export function useTopology(canvasWidth = 640, canvasHeight = 480) {
  const { data: devices } = useRealtimeDevices()
  const { data: telemetry, status: telStatus } = useRealtimeTelemetry(50)
  const [inspectedNode, setInspectedNode] = useState<TopologyNode | null>(null)
  const [activities, setActivities] = useState<SignalActivity[]>([])
  const lastTickRef = useRef<number>(0)

  const graph = useMemo(() => {
    const healthMap = new Map<string, number>()
    const heartbeatMap = new Map<string, string>()
    const telemetryMap = new Map<string, string>()
    const latencyMap = new Map<string, number>()

    for (const d of devices) {
      if (d.device_id) {
        healthMap.set(d.device_id, d.health ?? 100)
        if (d.last_sync) heartbeatMap.set(d.device_id, d.last_sync)
      }
    }

    for (const t of telemetry) {
      if (t.created_at) {
        telemetryMap.set("MYK-CH-001", t.created_at)
      }
    }

    const nodeDefs: {
      id: string
      nodeType: NodeType
      label: string
      capabilities: DeviceCapability[]
      metadata: Record<string, string | number | boolean | null>
    }[] = [
      // ── CLOUD LAYER ──
      {
        id: "cloud-01", nodeType: "cloud", label: "Telemetry Backbone",
        capabilities: [], metadata: { region: "NA-East / DC-02" },
      },
      {
        id: "sync-01", nodeType: "remote-sync", label: "Remote Sync",
        capabilities: [], metadata: { protocol: "WebSocket", interval: "1.5s" },
      },
      {
        id: "analytics-01", nodeType: "analytics", label: "Analytics Engine",
        capabilities: [], metadata: { shards: 4, throughput: "2.1M msg/h" },
      },

      // ── INTELLIGENCE LAYER ──
      {
        id: "ai-01", nodeType: "ai-inference", label: "Intelligence Engine",
        capabilities: [], metadata: { model: "MYK-v3", accuracy: "98.2%" },
      },
      {
        id: "pred-01", nodeType: "predictive", label: "Predictive Engine",
        capabilities: [], metadata: { horizon: "24h", confidence: "96%" },
      },
      {
        id: "broker-01", nodeType: "broker", label: "Telemetry Broker",
        capabilities: [], metadata: { queueDepth: 0, throughput: "5k msg/s" },
      },
      {
        id: "corr-01", nodeType: "correlator", label: "Alert Engine",
        capabilities: [], metadata: { rulesActive: 42, latency: "18ms" },
      },

      // ── ZONES (Sensors) ──
      {
        id: "MYK-CH-001", nodeType: "chamber", label: "Zone A",
        capabilities: [
          { type: "environment", label: "Temperature", unit: "°C" },
          { type: "environment", label: "Humidity", unit: "%" },
          { type: "environment", label: "CO\u2082", unit: "ppm" },
        ],
        metadata: { cluster: "Alpha", region: "NA-East / DC-02" },
      },
      {
        id: "zone-b-01", nodeType: "temp-sensor", label: "Zone B",
        capabilities: [{ type: "temperature_sensor", label: "Temperature", unit: "°C" }],
        metadata: { model: "SHT31", accuracy: "\u00b10.3\u00b0C" },
      },
      {
        id: "zone-c-01", nodeType: "humidity-sensor", label: "Zone C",
        capabilities: [{ type: "humidity_sensor", label: "Humidity", unit: "%" }],
        metadata: { model: "SHT31", accuracy: "\u00b12%" },
      },

      // ── ESP32 ──
      {
        id: "esp32-01", nodeType: "esp32", label: "ESP32 Gateway",
        capabilities: [
          { type: "connectivity", label: "WiFi", unit: "" },
          { type: "connectivity", label: "Bluetooth", unit: "" },
        ],
        metadata: { firmware: "MYK-v1.2", uptime: "14d 6h" },
      },

      // ── EDGE LAYER: Additional Sensors ──
      {
        id: "mesh-01", nodeType: "sensor-mesh", label: "Sensor Mesh",
        capabilities: [{ type: "mesh", label: "Mesh Gateway", unit: "" }],
        metadata: { protocol: "Zigbee", devices: 12 },
      },
      {
        id: "co2-01", nodeType: "co2-sensor", label: "CO\u2082 Sensor",
        capabilities: [{ type: "co2", label: "CO\u2082", unit: "ppm" }],
        metadata: { model: "MH-Z19B", range: "0-5000ppm" },
      },
      {
        id: "flow-01", nodeType: "airflow-sensor", label: "Airflow Sensor",
        capabilities: [{ type: "airflow_sensor", label: "Airflow", unit: "m/s" }],
        metadata: { model: "AIRFLOW-01", range: "0-10m/s" },
      },

      // ── CONTROL LAYER ──
      {
        id: "relay-ctrl-01", nodeType: "relay-controller", label: "Relay Controller",
        capabilities: [{ type: "relay", label: "Relay Driver", unit: "" }],
        metadata: { channels: 8, maxCurrent: "10A" },
      },
      {
        id: "vent-01", nodeType: "ventilation-controller", label: "Ventilation Fan",
        capabilities: [{ type: "fan_actuator", label: "Fan Actuator", unit: "" }],
        metadata: { model: "FAN-01", speed: "0-100%" },
      },
      {
        id: "hum-act-01", nodeType: "humidity-actuator", label: "Humidifier",
        capabilities: [{ type: "humidifier_actuator", label: "Misting System", unit: "" }],
        metadata: { model: "HUM-01", capacity: "500ml/h" },
      },
      {
        id: "thermal-01", nodeType: "thermal-regulator", label: "Thermal Regulator",
        capabilities: [{ type: "thermal", label: "Thermal Control", unit: "°C" }],
        metadata: { range: "18-32°C", precision: "\u00b10.2\u00b0C" },
      },

      // ── INFRASTRUCTURE ──
      {
        id: "edge-comp-01", nodeType: "edge-compute", label: "Edge Compute",
        capabilities: [], metadata: { cores: 4, ram: "8GB" },
      },
      {
        id: "archive-01", nodeType: "archive", label: "Archive Node",
        capabilities: [], metadata: { retention: "90d", size: "128GB" },
      },
      {
        id: "failover-01", nodeType: "failover", label: "Failover Node",
        capabilities: [], metadata: { mode: "hot-standby", failoverTime: "3s" },
      },
      {
        id: "recovery-01", nodeType: "recovery", label: "Recovery Engine",
        capabilities: [], metadata: { mode: "standby", rto: "45s" },
      },
      {
        id: "MYK-SIM-001", nodeType: "simulator", label: "Local Simulator",
        capabilities: [], metadata: { source: "browser" },
      },
      {
        id: "power-01", nodeType: "power", label: "Power Supply",
        capabilities: [], metadata: { voltage: "5V", maxCurrent: "2A" },
      },
    ]

    for (const d of devices) {
      if (!d.device_id) continue
      const deviceType = d.device_type ?? inferDeviceType(d.device_id)
      const caps = getDeviceCapabilities(deviceType)
      const nodeType: NodeType = caps.some((c) => c.includes("actuator")) ? "relay" : "sensor"

      nodeDefs.push({
        id: d.device_id,
        nodeType,
        label: `${deviceType} (${d.device_id.split("-").pop()})`,
        capabilities: caps.map((c) => ({
          type: c,
          label: c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        })),
        metadata: {
          deviceType,
          role: caps.join(", "),
        },
      })
    }

    return buildTopologyGraph(
      nodeDefs,
      healthMap,
      heartbeatMap,
      telemetryMap,
      latencyMap,
      { canvasWidth, canvasHeight, centerX: canvasWidth / 2, centerY: canvasHeight / 2 }
    )
  }, [devices, telemetry, canvasWidth, canvasHeight])

  const metrics = useMemo(() => computeTopologyMetrics(graph.nodes, graph.links), [graph])

  const graphLinksRef = useRef(graph.links)

  useEffect(() => {
    graphLinksRef.current = graph.links
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const lastTick = lastTickRef.current
      lastTickRef.current = now

      const links = graphLinksRef.current
      const telActivities = generateTelemetryActivity(links, now, lastTick)
      const hbActivities = generateHeartbeatActivity(links, now)

      setActivities((prev) => {
        const merged = [...prev, ...telActivities, ...hbActivities]
        return pruneActivityHistory(merged, now)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const connected = telStatus === "live"

  return {
    graph,
    metrics,
    activities,
    inspectedNode,
    setInspectedNode,
    connected,
  }
}
