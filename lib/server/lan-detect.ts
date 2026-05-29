import "server-only"
import os from "os"

const VIRTUAL_PATTERNS = [
  /^VirtualBox/i,
  /^VMware/i,
  /^vEthernet/i,
  /^Hyper-V/i,
  /^Docker/i,
  /^vboxnet/i,
  /^Loopback/i,
  /^Bluetooth/i,
  /^Wintun/i,
]

const VIRTUAL_SUBNETS = [
  /^192\.168\.56\./,   // VirtualBox Host-Only
  /^10\.0\.2\./,       // VirtualBox NAT
  /^172\./,            // Docker default
  /^169\.254\./,       // APIPA (no real network)
]

export interface LANInfo {
  /** All non-loopback, non-virtual IPv4 addresses */
  allIPs: string[]
  /** Filtered: real WiFi/Ethernet only */
  realIPs: string[]
  /** Primary LAN IP (best candidate for ESP32) */
  primaryLAN: string | null
  /** Name of the interface that provides primaryLAN */
  primaryInterface: string | null
  /** All interface details for debugging */
  interfaceDetail: Array<{
    name: string
    ip: string
    skipped: boolean
    reason?: string
  }>
}

export function detectLAN(): LANInfo {
  const ifaces = os.networkInterfaces()
  const allIPs: string[] = []
  const realIPs: string[] = []
  const interfaceDetail: LANInfo["interfaceDetail"] = []

  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family !== "IPv4" || addr.internal) continue

      const ip = addr.address
      allIPs.push(ip)

      let skipped = false
      let reason = ""

      // Check interface name patterns
      for (const pattern of VIRTUAL_PATTERNS) {
        if (pattern.test(name)) {
          skipped = true
          reason = `virtual interface (${name})`
          break
        }
      }

      // Check virtual subnet ranges
      if (!skipped) {
        for (const pattern of VIRTUAL_SUBNETS) {
          if (pattern.test(ip)) {
            skipped = true
            reason = `virtual subnet (${ip})`
            break
          }
        }
      }

      interfaceDetail.push({ name, ip, skipped, reason: reason || undefined })

      if (!skipped) {
        realIPs.push(ip)
      }
    }
  }

  // Priority: prefer 192.168.0.x subnet, then 192.168.1.x, then 192.168.x.x, then 10.0.x.x
  const priorityOrder = [
    (ip: string) => ip.startsWith("192.168.0.") ? 0 : -1,
    (ip: string) => ip.startsWith("192.168.1.") ? 1 : -1,
    (ip: string) => ip.startsWith("192.168.") ? 2 : -1,
    (ip: string) => ip.startsWith("10.0.") ? 3 : -1,
    (_ip: string) => 4, // any other
  ]

  let primaryLAN: string | null = null
  let primaryInterface: string | null = null
  let bestPriority = 999

  for (const ip of realIPs) {
    for (let i = 0; i < priorityOrder.length; i++) {
      const p = priorityOrder[i](ip)
      if (p >= 0 && p < bestPriority) {
        bestPriority = p
        primaryLAN = ip
        const detail = interfaceDetail.find((d) => d.ip === ip)
        primaryInterface = detail?.name ?? null
        break
      }
    }
  }

  // Fallback: if no match in priority, use first real IP
  if (!primaryLAN && realIPs.length > 0) {
    primaryLAN = realIPs[0]
    const detail = interfaceDetail.find((d) => d.ip === realIPs[0])
    primaryInterface = detail?.name ?? null
  }

  return { allIPs, realIPs, primaryLAN, primaryInterface, interfaceDetail }
}
