import { writeDemoTelemetry, clearDemoTelemetry, getActiveTelemetry } from "@/lib/server/telemetry-store"

let demoActive = false

export async function POST(req: Request) {
  const body = await req.json()

  if (body.action === "start") {
    demoActive = true
    console.log("DEMO SIMULATION STARTED")
    return Response.json({ success: true, demoActive: true })
  }

  if (body.action === "stop") {
    demoActive = false
    clearDemoTelemetry()
    console.log("DEMO SIMULATION STOPPED")
    return Response.json({ success: true, demoActive: false })
  }

  if (typeof body.temp === "number" && typeof body.hum === "number") {
    writeDemoTelemetry({ temp: body.temp, hum: body.hum })
    return Response.json({ success: true, demoActive })
  }

  return Response.json({ error: "Invalid body" }, { status: 400 })
}

export async function GET() {
  const active = getActiveTelemetry()
  return Response.json({
    temp: active.temp,
    hum: active.hum,
    fan: active.fan,
    humidifier: active.humidifier,
    freshnessMs: active.freshnessMs,
    stale: active.stale,
    source: active.source,
    simulated: active.simulated ?? null,
  })
}
