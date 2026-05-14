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
      {
        id: "cloud-01",
        nodeType: "cloud",
        label: "MYKOSPHARE Cloud",
        capabilities: [],
        metadata: { region: "NA-East / DC-02" },
      },
      {
        id: "MYK-CH-001",
        nodeType: "chamber",
        label: "Chamber Alpha",
        capabilities: [
          { type: "environment", label: "Temperature", unit: "°C" },
          { type: "environment", label: "Humidity", unit: "%" },
          { type: "environment", label: "CO₂", unit: "ppm" },
        ],
        metadata: { cluster: "Alpha", region: "NA-East / DC-02" },
      },
      {
        id: "MYK-SIM-001",
        nodeType: "simulator",
        label: "Local Simulator",
        capabilities: [],
        metadata: { source: "browser" },
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

    nodeDefs.push({
      id: "power-01",
      nodeType: "power",
      label: "Power Supply",
      capabilities: [],
      metadata: { voltage: "5V", maxCurrent: "2A" },
    })

    return buildTopologyGraph(
      nodeDefs,
      healthMap,
      heartbeatMap,
      telemetryMap,
      latencyMap,
      { canvasWidth, canvasHeight }
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
