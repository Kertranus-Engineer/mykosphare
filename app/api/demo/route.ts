let demoActive = false
let demoData = { temp: 0, hum: 0 }

export async function POST(req: Request) {
  const body = await req.json()

  if (body.action === "start") {
    demoActive = true
    console.log("DEMO SIMULATION STARTED")
    return Response.json({ success: true, demoActive: true })
  }

  if (body.action === "stop") {
    demoActive = false
    console.log("DEMO SIMULATION STOPPED")
    return Response.json({ success: true, demoActive: false })
  }

  if (typeof body.temp === "number" && typeof body.hum === "number") {
    demoData = { temp: body.temp, hum: body.hum }
    return Response.json({ success: true })
  }

  return Response.json({ error: "Invalid body" }, { status: 400 })
}

export async function GET() {
  return Response.json({ ...demoData, demoActive })
}
