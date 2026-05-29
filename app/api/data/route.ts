import { writeTelemetry, readTelemetry, recordTelemetryError } from "@/lib/server/telemetry-store"

// ── POST /api/data — ESP32 sends telemetry ──────
export async function POST(req: Request) {
  const serverReceivedAt = new Date().toISOString()

  try {
    const body = await req.json()

    console.log("[API:DATA] incoming", JSON.stringify(body))

    const rawTemp = body.temp
    const rawHum = body.hum

    // Validate
    const temp = Number(rawTemp)
    const hum = Number(rawHum)

    const parsed = { temp, hum, fan: body.fan, humidifier: body.humidifier, timestamp: body.timestamp }
    console.log("[API:DATA] parsed", JSON.stringify(parsed))

    if (!isFinite(temp) || !isFinite(hum)) {
      console.error(
        `[API:DATA] rejected invalid — temp=${rawTemp} hum=${rawHum} from=${req.headers.get("x-forwarded-for") ?? "local"}`
      )
      recordTelemetryError()
      return Response.json({ success: false, error: "Invalid temp/hum" }, { status: 400 })
    }

    if (temp < -50 || temp > 100 || hum < 0 || hum > 100) {
      console.error(
        `[API:DATA] rejected out of bounds — temp=${temp} hum=${hum}`
      )
      recordTelemetryError()
      return Response.json({ success: false, error: "temp/hum out of valid range" }, { status: 400 })
    }

    const record = writeTelemetry({
      temp,
      hum,
      fan: body.fan ?? null,
      humidifier: body.humidifier ?? null,
      rawTimestamp: body.timestamp ?? null,
    })

    console.log("[API:DATA] stored", JSON.stringify({
      temp: record.temp,
      hum: record.hum,
      fan: record.fan,
      humidifier: record.humidifier,
      heartbeat: record.heartbeat,
    }))

    console.log(
      `[API:DATA] POST OK — ${temp}°C ${hum}% fan=${body.fan} humd=${body.humidifier} at=${serverReceivedAt}`
    )

    return Response.json({
      success: true,
      heartbeat: record.heartbeat,
      serverReceivedAt: record.serverReceivedAt,
    })
  } catch (err) {
    console.error(`[API:DATA] POST parse error:`, err)
    recordTelemetryError()
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }
}

// ── GET /api/data — frontend polls this ─────────
export async function GET() {
  const snap = readTelemetry()

  console.log(
    `[API:DATA] GET → temp=${snap.temp} hum=${snap.hum} heartbeat=${snap.heartbeat ? "yes" : "no"} freshness=${snap.freshnessMs}ms stale=${snap.stale} posts=${snap.postCount} errors=${snap.errorCount}`
  )

  return Response.json({
    temp: snap.temp,
    hum: snap.hum,
    fan: snap.fan,
    humidifier: snap.humidifier,
    heartbeat: snap.heartbeat,
    serverReceivedAt: snap.serverReceivedAt,
    freshnessMs: snap.freshnessMs,
    stale: snap.stale,
    postCount: snap.postCount,
    errorCount: snap.errorCount,
    storeCreatedAt: snap.storeCreatedAt,
  })
}

// ── HEAD /api/data — lightweight liveness check ──
export async function HEAD() {
  const snap = readTelemetry()
  return new Response(null, {
    status: 200,
    headers: {
      "X-Telemetry-FreshnessMs": String(snap.freshnessMs),
      "X-Telemetry-Stale": snap.stale ? "1" : "0",
      "X-Telemetry-Posts": String(snap.postCount),
    },
  })
}
