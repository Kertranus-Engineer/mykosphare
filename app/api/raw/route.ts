import { writeTelemetry } from "@/lib/server/telemetry-store"

const RAW_KEY = "__mykosphare_raw_packets_v1" as const

interface RawPacket {
  body: string
  headers: Record<string, string>
  method: string
  url: string
  receivedAt: string
  sourceIP: string | null
}

interface RawStore {
  packets: RawPacket[]
  lastPacket: RawPacket | null
  postCount: number
  errorCount: number
}

interface GlobalWithRaw {
  [RAW_KEY]: RawStore
}

function getRawStore(): RawStore {
  const g = globalThis as unknown as GlobalWithRaw
  if (!g[RAW_KEY]) {
    g[RAW_KEY] = { packets: [], lastPacket: null, postCount: 0, errorCount: 0 }
  }
  return g[RAW_KEY]
}

function bigBanner(title: string, lines: string[]) {
  const width = 56
  const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length))
  console.log("")
  console.log("╔" + "═".repeat(width) + "╗")
  console.log("║  " + pad(title, width - 2) + "║")
  console.log("╠" + "═".repeat(width) + "╣")
  for (const line of lines) {
    console.log("║  " + pad(line, width - 2) + "║")
  }
  console.log("╚" + "═".repeat(width) + "╝")
  console.log("")
}

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const receivedAt = new Date().toISOString()

  try {
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })

    const body = await req.text()
    const sourceIP = headers["x-forwarded-for"] ?? headers["x-real-ip"] ?? "local"

    bigBanner("RAW PACKET RECEIVED", [
      `TIME: ${receivedAt}`,
      `IP:   ${sourceIP}`,
      `URL:  ${req.url}`,
      `BODY: ${body.length > 200 ? body.slice(0, 200) + "..." : body}`,
    ])

    const store = getRawStore()
    const packet: RawPacket = { body, headers, method: req.method, url: req.url, receivedAt, sourceIP }
    store.packets.push(packet)
    if (store.packets.length > 100) store.packets.shift()
    store.lastPacket = packet
    store.postCount++

    // Bridge: if valid temp/hum JSON, feed telemetry store
    try {
      const json = JSON.parse(body)
      if (typeof json.temp === "number" && typeof json.hum === "number") {
        const temp = Number(json.temp)
        const hum = Number(json.hum)
        if (isFinite(temp) && isFinite(hum) && temp >= -50 && temp <= 100 && hum >= 0 && hum <= 100) {
          writeTelemetry({
            temp,
            hum,
            fan: json.fan ?? null,
            humidifier: json.humidifier ?? null,
            rawTimestamp: json.timestamp ?? null,
          })
          console.log("[RAW] → telemetry store bridged: " + temp + "°C " + hum + "%")
        }
      }
    } catch {
      // body is not valid JSON with temp/hum — raw store only
    }

    return Response.json({
      ok: true,
      received: true,
      length: body.length,
      ts: Date.now(),
    })
  } catch (err) {
    const store = getRawStore()
    store.errorCount++
    console.error("[RAW] POST error:", err)
    return Response.json({ ok: false, error: "failed to read body" }, { status: 400 })
  }
}

export async function GET() {
  const store = getRawStore()

  return Response.json({
    ok: true,
    lastPacket: store.lastPacket,
    postCount: store.postCount,
    errorCount: store.errorCount,
    recentPackets: store.packets.slice(-5).reverse(),
    ts: Date.now(),
  })
}
