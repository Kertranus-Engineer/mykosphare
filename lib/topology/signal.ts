import type { SignalActivity, SignalLink } from "./types"

const ACTIVITY_HISTORY_MS = 2000

export function generateTelemetryActivity(
  links: SignalLink[],
  now: number,
  lastTick: number
): SignalActivity[] {
  const activities: SignalActivity[] = []

  for (const link of links) {
    if (!link.active) continue
    const shouldPulse = Math.random() < link.packetRate * ((now - lastTick) / 1000)
    if (shouldPulse) {
      activities.push({
        linkId: link.id,
        timestamp: now,
        type: link.type,
        strength: 0.4 + Math.random() * 0.6,
      })
    }
  }

  return activities
}

export function generateHeartbeatActivity(
  links: SignalLink[],
  now: number
): SignalActivity[] {
  const activities: SignalActivity[] = []
  for (const link of links) {
    if (!link.active) continue
    if (Math.random() < 0.02) {
      activities.push({
        linkId: link.id,
        timestamp: now,
        type: "heartbeat",
        strength: 0.8 + Math.random() * 0.2,
      })
    }
  }
  return activities
}

export function pruneActivityHistory(
  activities: SignalActivity[],
  now: number
): SignalActivity[] {
  return activities.filter((a) => now - a.timestamp < ACTIVITY_HISTORY_MS)
}

export function getActiveLinkCount(
  links: SignalLink[],
  activityWindow: SignalActivity[],
  now: number
): number {
  const recent = activityWindow.filter((a) => now - a.timestamp < ACTIVITY_HISTORY_MS)
  const activeLinkIds = new Set(recent.map((a) => a.linkId))
  return activeLinkIds.size
}

export function computeConnectionQuality(link: SignalLink): number {
  const latencyScore = Math.max(0, 100 - link.latency * 2)
  const statusWeight = link.active ? 30 : 0
  return Math.round(latencyScore * 0.7 + statusWeight)
}
