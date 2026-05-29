import "server-only"
import os from "os"
import { detectLAN } from "./lib/server/lan-detect"

export async function registerNode() {
  const port = process.env.PORT ?? "3000"

  let lan = detectLAN()

  function printStartup() {
    console.log("")
    console.log("╔══════════════════════════════════════════════╗")
    console.log("║        MYKOSPHARE — SERVER START             ║")
    console.log("╚══════════════════════════════════════════════╝")
    console.log("")
    console.log(`  [SERVER] listening on 0.0.0.0:${port}`)
    console.log(`  [SERVER] NODE_ENV: ${process.env.NODE_ENV ?? "development"}`)
    console.log(`  [SERVER] hostname: ${os.hostname()}`)
    console.log("")

    if (lan.primaryInterface) {
      console.log(`  PRIMARY ACTIVE INTERFACE: ${lan.primaryInterface}`)
      console.log("")
    }

    console.log("  ── REAL LAN interfaces ──")
    for (const ip of lan.realIPs) {
      console.log(`    → ${ip}:${port}`)
    }
    if (lan.realIPs.length === 0) {
      console.log("    → NONE DETECTED — check network connection")
    }
    console.log("")
    if (lan.primaryLAN) {
      console.log("  ╔══════════════════════════════════════════╗")
      console.log(`  ║  PRIMARY LAN → ${lan.primaryLAN.padEnd(27)}║`)
      console.log("  ║  ESP32 target:                            ║")
      console.log(`  ║  http://${lan.primaryLAN}:${port}/api/raw`.padEnd(47) + "║")
      console.log("  ╚══════════════════════════════════════════╝")
    }
    console.log("")
    if (lan.allIPs.filter((ip) => !lan.realIPs.includes(ip)).length > 0) {
      console.log("  ── IGNORED (virtual interfaces) ──")
      for (const d of lan.interfaceDetail) {
        if (d.skipped) {
          console.log(`    ✗ ${d.ip} — ${d.reason}`)
        }
      }
      console.log("")
    }
    console.log("  ═══════════════════════════════════════════")
    console.log("  FIREWALL (PowerShell Admin):")
    console.log(`  New-NetFirewallRule -DisplayName "Next.js (${port})" -Direction Inbound -LocalPort ${port} -Protocol TCP -Action Allow`)
    console.log("  ═══════════════════════════════════════════")
    console.log("")
  }

  printStartup()

  // Periodic: re-detect LAN IPs and warn if changed
  let firstInterval = true
  setInterval(() => {
    const newLAN = detectLAN()
    if (firstInterval) { firstInterval = false; lan = newLAN; return }

    if (newLAN.primaryLAN && newLAN.primaryLAN !== lan.primaryLAN) {
      console.log("")
      console.log("╔══════════════════════════════════════════════╗")
      console.log("║  ⚠  LAN IP CHANGED                           ║")
      console.log("╠══════════════════════════════════════════════╣")
      console.log(`║  OLD: ${lan.primaryLAN?.padEnd(34) ?? "none".padEnd(34)}║`)
      console.log(`║  NEW: ${newLAN.primaryLAN?.padEnd(34) ?? "none".padEnd(34)}║`)
      console.log("╠══════════════════════════════════════════════╣")
      console.log(`║  Update ESP32 firmware to:                   ║`)
      if (newLAN.primaryLAN) {
        console.log(`║  http://${newLAN.primaryLAN}:${port}/api/raw`.padEnd(47) + "║")
      }
      console.log("╚══════════════════════════════════════════════╝")
      console.log("")
      lan = newLAN
    }
  }, 30000)

  // Periodic no-packet warning
  const startTime = Date.now()
  const RAW_KEY = "__mykosphare_raw_packets_v1"
  setInterval(() => {
    const g = globalThis as unknown as Record<string, { postCount: number }>
    const store = g[RAW_KEY]
    if (!store) return

    const elapsed = Math.round((Date.now() - startTime) / 1000)

    if (store.postCount === 0 && elapsed >= 30 && elapsed % 15 === 0) {
      console.log(`[ESP32] NO PACKETS RECEIVED IN ${elapsed}s`)
    }

    if (store.postCount > 0) {
      console.log(`[ESP32] PACKET RECEIVED! Total: ${store.postCount}`)
    }
  }, 15000)
}
