import type { IngestionSource } from "@/lib/ingestion"

export type PacketType = "telemetry" | "heartbeat" | "event"

export interface PacketRecord {
  id: string
  receivedAt: string
  source: string
  deviceId: string
  payloadTimestamp: string
  ingestionLatencyMs: number
  type: PacketType
  accepted: boolean
  rejectReason?: string
}

export interface SourceTiming {
  source: string
  packetCount: number
  lastPacketAt: string | null
  firstPacketAt: string | null
  avgIntervalMs: number
  minIntervalMs: number
  maxIntervalMs: number
  lastIntervalMs: number | null
}

export interface LatencyStats {
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
  sampleCount: number
}

export interface HeartbeatRecord {
  deviceId: string
  deviceType: string
  lastHeartbeatAt: string
  lastStatus: string
  lastHealth: number
  intervalMs: number | null
  expectedIntervalMs: number
  missedBeat: boolean
}

const MAX_PACKETS = 5000
const packets: PacketRecord[] = []

export function recordPacket(entry: Omit<PacketRecord, "id">): void {
  packets.unshift({
    id: crypto.randomUUID(),
    ...entry,
  })
  if (packets.length > MAX_PACKETS) {
    packets.length = MAX_PACKETS
  }
}

export function getRecentPackets(
  limit = 100,
  source?: string
): PacketRecord[] {
  let filtered = packets
  if (source) {
    filtered = packets.filter((p) => p.source === source)
  }
  return filtered.slice(0, limit)
}

export function getSourceTimings(): SourceTiming[] {
  const groups = new Map<string, PacketRecord[]>()
  for (const p of packets) {
    if (!p.accepted) continue
    const list = groups.get(p.source) ?? []
    list.push(p)
    groups.set(p.source, list)
  }

  const timings: SourceTiming[] = []
  for (const [source, sourcePackets] of groups) {
    if (sourcePackets.length < 2) {
      timings.push({
        source,
        packetCount: sourcePackets.length,
        lastPacketAt: sourcePackets[0]?.receivedAt ?? null,
        firstPacketAt: sourcePackets[sourcePackets.length - 1]?.receivedAt ?? null,
        avgIntervalMs: 0,
        minIntervalMs: 0,
        maxIntervalMs: 0,
        lastIntervalMs: null,
      })
      continue
    }

    const intervals: number[] = []
    for (let i = 0; i < sourcePackets.length - 1; i++) {
      const a = new Date(sourcePackets[i].receivedAt).getTime()
      const b = new Date(sourcePackets[i + 1].receivedAt).getTime()
      intervals.push(a - b)
    }

    timings.push({
      source,
      packetCount: sourcePackets.length,
      lastPacketAt: sourcePackets[0].receivedAt,
      firstPacketAt: sourcePackets[sourcePackets.length - 1].receivedAt,
      avgIntervalMs: Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length),
      minIntervalMs: Math.min(...intervals),
      maxIntervalMs: Math.max(...intervals),
      lastIntervalMs: intervals[0] ?? null,
    })
  }

  return timings.sort((a, b) => b.packetCount - a.packetCount)
}

export function getLatencyStats(type?: PacketType): LatencyStats {
  const relevant = type
    ? packets.filter((p) => p.accepted && p.type === type)
    : packets.filter((p) => p.accepted)

  if (relevant.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, sampleCount: 0 }
  }

  const latencies = relevant.map((p) => p.ingestionLatencyMs).sort((a, b) => a - b)
  const sum = latencies.reduce((s, v) => s + v, 0)

  return {
    min: latencies[0],
    max: latencies[latencies.length - 1],
    avg: Math.round(sum / latencies.length),
    p50: latencies[Math.floor(latencies.length * 0.5)],
    p95: latencies[Math.floor(latencies.length * 0.95)],
    p99: latencies[Math.floor(latencies.length * 0.99)],
    sampleCount: relevant.length,
  }
}

export function getHeartbeatRecords(): HeartbeatRecord[] {
  const heartbeats = packets.filter(
    (p) => p.accepted && p.type === "heartbeat"
  )

  const deviceMap = new Map<
    string,
    { last: PacketRecord; prev: PacketRecord | null }
  >()

  for (const hb of heartbeats) {
    const existing = deviceMap.get(hb.deviceId)
    if (!existing) {
      deviceMap.set(hb.deviceId, { last: hb, prev: null })
    } else if (
      new Date(hb.receivedAt).getTime() >
      new Date(existing.last.receivedAt).getTime()
    ) {
      deviceMap.set(hb.deviceId, { last: hb, prev: existing.last })
    }
  }

  const records: HeartbeatRecord[] = []
  for (const [deviceId, { last, prev }] of deviceMap) {
    const intervalMs =
      prev && last
        ? new Date(last.receivedAt).getTime() -
          new Date(prev.receivedAt).getTime()
        : null

    records.push({
      deviceId,
      deviceType: deviceId.split("-")[0] ?? "unknown",
      lastHeartbeatAt: last.receivedAt,
      lastStatus: "online",
      lastHealth: 100,
      intervalMs,
      expectedIntervalMs: 60_000,
      missedBeat: intervalMs !== null && intervalMs > 75_000,
    })
  }

  return records.sort(
    (a, b) =>
      new Date(b.lastHeartbeatAt).getTime() -
      new Date(a.lastHeartbeatAt).getTime()
  )
}

export function getRecentLatencySamples(
  limit = 60
): { timestamp: string; latencyMs: number; type: string }[] {
  return packets
    .filter((p) => p.accepted)
    .slice(0, limit)
    .map((p) => ({
      timestamp: p.receivedAt,
      latencyMs: p.ingestionLatencyMs,
      type: p.type,
    }))
}

export function isPhysicalSource(source: string): boolean {
  return source !== "simulator" && source !== "dev-unknown"
}

export function getPhysicalSources(): string[] {
  const sources = new Set<string>()
  for (const p of packets) {
    if (isPhysicalSource(p.source)) {
      sources.add(p.source)
    }
  }
  return [...sources]
}

export function getLastPhysicalPacket(): PacketRecord | null {
  for (const p of packets) {
    if (isPhysicalSource(p.source)) return p
  }
  return null
}

export function getPacketSourceBreakdown(): {
  physical: number
  simulator: number
} {
  let physical = 0
  let simulator = 0
  for (const p of packets) {
    if (isPhysicalSource(p.source)) {
      physical++
    } else {
      simulator++
    }
  }
  return { physical, simulator }
}
