"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useRealtimeDevices, useRealtimeTelemetry } from "@/lib/realtime/subscriptions"
import { buildTopologyGraph } from "./graph"
import { computeTopologyMetrics } from "./metrics"
import { generateTelemetryActivity, generateHeartbeatActivity, pruneActivityHistory } from "./signal"
import type { SignalActivity, TopologyNode } from "./types"
import type { NodeType, DeviceCapability } from "./node-types"

export function useTopology(_canvasWidth = 640, _canvasHeight = 480) {
  const { data: devices } = useRealtimeDevices()
  const { data: telemetry, status: telStatus } = useRealtimeTelemetry(50)
  const [inspectedNode, setInspectedNode] = useState<TopologyNode | null>(null)
  const [activities, setActivities] = useState<SignalActivity[]>([])
  const lastTickRef = useRef<number>(0)

  const graph = useMemo(() => {
    const healthMap = new Map<string, number>()
    const heartbeatMap = new Map<string, string>()
    const telemetryMap = new Map<string, string>()

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
      // ═══════════ APPLICATION LAYER ═══════════
      {
        id: "app-visual-intelligence", nodeType: "visual-intelligence",
        label: "Visual Intelligence",
        capabilities: [],
        metadata: { model: "MYK-Vision-v2", latency: "120ms" },
      },
      {
        id: "app-dashboard", nodeType: "dashboard",
        label: "Dashboard",
        capabilities: [],
        metadata: { users: 3, refresh: "1s" },
      },
      {
        id: "app-analytics", nodeType: "analytics",
        label: "Analytics",
        capabilities: [],
        metadata: { shards: 4, throughput: "2.1M/h" },
      },

      // ═══════════ REASONING LAYER ═══════════
      // Row 1
      {
        id: "rea-processing", nodeType: "capture-processing",
        label: "Processing",
        capabilities: [],
        metadata: { pipeline: "image→crop→classify", load: "72%" },
      },
      {
        id: "rea-correlation", nodeType: "correlation-engine",
        label: "Correlation",
        capabilities: [],
        metadata: { rules: 18, latency: "22ms" },
      },
      {
        id: "rea-events", nodeType: "event-engine",
        label: "Events",
        capabilities: [],
        metadata: { queue: 0, rate: "14 evt/s" },
      },
      {
        id: "rea-observations", nodeType: "observation-engine",
        label: "Observations",
        capabilities: [],
        metadata: { active: 7, horizon: "6h" },
      },

      // Row 2
      {
        id: "rea-trends", nodeType: "trend-engine",
        label: "Trends",
        capabilities: [],
        metadata: { window: "7d", confidence: "94%" },
      },
      {
        id: "rea-recommendations", nodeType: "recommendation-engine",
        label: "Recommendations",
        capabilities: [],
        metadata: { pending: 2, accuracy: "91%" },
      },
      {
        id: "rea-validation", nodeType: "validation",
        label: "Validation",
        capabilities: [],
        metadata: { rules: 32, passRate: "97.4%" },
      },
      {
        id: "rea-knowledge", nodeType: "knowledge",
        label: "Knowledge",
        capabilities: [],
        metadata: { facts: "1.2M", relations: "340K" },
      },

      // ═══════════ STORAGE LAYER ═══════════
      {
        id: "sto-supabase-storage", nodeType: "supabase-storage",
        label: "Supabase Storage",
        capabilities: [],
        metadata: { bucket: "mykosphare-media", size: "14.2 GB" },
      },
      {
        id: "sto-supabase-db", nodeType: "supabase-db",
        label: "Supabase Database",
        capabilities: [],
        metadata: { engine: "PostgreSQL 15", rows: "2.8M" },
      },

      // ═══════════ CAPTURE LAYER ═══════════
      {
        id: "cap-poco", nodeType: "poco-c75",
        label: "Poco C75",
        capabilities: [],
        metadata: { camera: "50MP", interval: "5s" },
      },
      {
        id: "cap-snapshots", nodeType: "snapshot",
        label: "Snapshots",
        capabilities: [],
        metadata: { pending: 3, format: "JPEG/RAW" },
      },

      // ═══════════ PHYSICAL LAYER ═══════════
      {
        id: "phy-esp32", nodeType: "esp32",
        label: "ESP32",
        capabilities: [
          { type: "connectivity", label: "WiFi", unit: "" },
          { type: "connectivity", label: "Bluetooth", unit: "" },
        ],
        metadata: { firmware: "MYK-v1.2", uptime: "14d 6h" },
      },
      {
        id: "phy-sensors", nodeType: "sensor",
        label: "Sensors",
        capabilities: [
          { type: "environment", label: "Temperature", unit: "°C" },
          { type: "environment", label: "Humidity", unit: "%" },
          { type: "environment", label: "CO₂", unit: "ppm" },
        ],
        metadata: { count: 5, bus: "I²C / SPI" },
      },
      {
        id: "phy-actuators", nodeType: "relay",
        label: "Actuators",
        capabilities: [
          { type: "relay", label: "Relay Bank", unit: "" },
          { type: "fan", label: "Ventilation", unit: "" },
          { type: "pump", label: "Humidifier", unit: "" },
        ],
        metadata: { channels: 8, voltage: "12V" },
      },
    ]

    return buildTopologyGraph(
      nodeDefs,
      healthMap,
      heartbeatMap,
      telemetryMap,
    )
  }, [devices, telemetry])

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
