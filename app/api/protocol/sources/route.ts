import { NextResponse } from "next/server"
import {
  getSourceTimings,
  getLatencyStats,
  getHeartbeatRecords,
  getRecentLatencySamples,
  getRecentPackets,
  getPhysicalSources,
  getLastPhysicalPacket,
  getPacketSourceBreakdown,
} from "@/lib/protocol"
import { getDuplicateCount, getFloodCounters } from "@/lib/protocol"

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get("source") ?? undefined

  const timings = getSourceTimings()
  const latencyStats = getLatencyStats()
  const heartbeats = getHeartbeatRecords()
  const latencySamples = getRecentLatencySamples(60)
  const recentPackets = getRecentPackets(25, source)
  const duplicateCount = getDuplicateCount()
  const floodCounters = getFloodCounters()

  const physicalSources = getPhysicalSources()
  const lastPhysicalPacket = getLastPhysicalPacket()
  const sourceBreakdown = getPacketSourceBreakdown()

  return NextResponse.json({
    timings,
    latencyStats,
    heartbeats,
    latencySamples,
    recentPackets,
    duplicateCount,
    floodCounters,
    bridge: {
      physicalSources,
      lastPhysicalPacket,
      sourceBreakdown,
      hasActivePhysicalSource: physicalSources.length > 0,
    },
  })
}
