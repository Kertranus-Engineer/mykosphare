import "server-only"
import { detectLAN } from "@/lib/server/lan-detect"
import os from "os"

const IP_CACHE_KEY = "__mykosphare_lan_history_v1" as const

interface IPCache {
  lastPrimaryLAN: string | null
  lastDetectedAt: string
  changeCount: number
  history: Array<{ ip: string; detectedAt: string }>
}

function getIPCache(): IPCache {
  const g = globalThis as unknown as Record<string, IPCache>
  if (!g[IP_CACHE_KEY]) {
    g[IP_CACHE_KEY] = { lastPrimaryLAN: null, lastDetectedAt: "", changeCount: 0, history: [] }
  }
  return g[IP_CACHE_KEY]
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const lan = detectLAN()
  const cache = getIPCache()
  const now = new Date().toISOString()
  const port = process.env.PORT ?? "3000"

  let ipChanged = false
  let previousIP: string | null = null
  let changeCount = cache.changeCount

  if (lan.primaryLAN && lan.primaryLAN !== cache.lastPrimaryLAN) {
    if (cache.lastPrimaryLAN) {
      previousIP = cache.lastPrimaryLAN
      ipChanged = true
      console.log(`[LAN] IP CHANGED: ${cache.lastPrimaryLAN} → ${lan.primaryLAN}`)
    }
    cache.lastPrimaryLAN = lan.primaryLAN
    cache.lastDetectedAt = now
    cache.changeCount++
    changeCount = cache.changeCount
    cache.history.push({ ip: lan.primaryLAN, detectedAt: now })
    if (cache.history.length > 20) cache.history.shift()
  }

  const esp32URL = lan.primaryLAN ? `http://${lan.primaryLAN}:${port}/api/raw` : null
  const pingURL = lan.primaryLAN ? `http://${lan.primaryLAN}:${port}/api/ping` : null

  return Response.json({
    hostname: os.hostname(),
    port,
    primaryLAN: lan.primaryLAN,
    primaryInterface: lan.primaryInterface,
    realIPs: lan.realIPs,
    allIPs: lan.allIPs,
    virtualIPs: lan.allIPs.filter((ip) => !lan.realIPs.includes(ip)),
    interfaceDetail: lan.interfaceDetail,
    ipChanged,
    previousIP,
    changeCount,
    ipHistory: cache.history.slice(-10),
    esp32URL,
    pingURL,
    timestamp: now,
  })
}
