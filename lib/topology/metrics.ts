import type { TopologyMetrics, TopologyNode, SignalLink } from "./types"

export function computeTopologyMetrics(
  nodes: TopologyNode[],
  links: SignalLink[]
): TopologyMetrics {
  const totalNodes = nodes.length
  const activeNodes = nodes.filter((n) => n.status === "online").length
  const offlineNodes = nodes.filter((n) => n.status === "offline").length
  const degradedNodes = nodes.filter((n) => n.status === "degraded").length
  const warningNodes = nodes.filter((n) => n.status === "warning").length
  const syncingNodes = nodes.filter((n) => n.status === "syncing").length
  const standbyNodes = nodes.filter((n) => n.status === "standby").length

  const activeLinks = links.filter((l) => l.active)
  const avgLatency = activeLinks.length > 0
    ? Math.round(activeLinks.reduce((s, l) => s + l.latency, 0) / activeLinks.length)
    : 0

  const totalPacketFlow = Math.round(links.reduce((s, l) => s + l.packetRate, 0) * 10) / 10

  const nodeHealth = nodes.map((n) => n.health)
  const avgHealth = nodeHealth.length > 0
    ? Math.round(nodeHealth.reduce((s, h) => s + h, 0) / nodeHealth.length)
    : 100

  const onlineNodes = activeNodes
  const totalRelevant = nodes.filter((n) => n.nodeType !== "cloud" && n.nodeType !== "simulator").length
  const uptimeQuality = totalRelevant > 0
    ? Math.round((onlineNodes / totalRelevant) * 100)
    : 100

  return {
    totalNodes,
    activeNodes,
    offlineNodes,
    degradedNodes,
    warningNodes,
    syncingNodes,
    standbyNodes,
    avgLatency,
    totalPacketFlow,
    uptimeQuality,
    avgHealth,
  }
}
