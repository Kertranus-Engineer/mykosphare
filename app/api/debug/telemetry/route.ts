import { readTelemetry, debugDump } from "@/lib/server/telemetry-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const snap = readTelemetry()
  const dump = debugDump()

  return Response.json({
    online: snap.heartbeat !== null && snap.stale === false,
    stale: snap.stale,
    lastUpdate: snap.heartbeat,
    serverReceivedAt: snap.serverReceivedAt,
    freshnessMs: snap.freshnessMs,
    telemetry: {
      temp: snap.temp,
      hum: snap.hum,
      fan: snap.fan,
      humidifier: snap.humidifier,
    },
    source: snap.heartbeat !== null ? "esp32" : "none",
    postCount: snap.postCount,
    errorCount: snap.errorCount,
    storeCreatedAt: snap.storeCreatedAt,
    serverTime: new Date().toISOString(),
    dump: {
      latest: dump.latest,
      postCount: dump.postCount,
      errorCount: dump.errorCount,
      createdAt: dump.createdAt,
    },
  })
}
