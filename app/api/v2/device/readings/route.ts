import { timingSafeEqual } from "node:crypto"
import { ingestDeviceReading } from "@/lib/grow/application/ingestion"
import { validateDeviceReadingPayload } from "@/lib/grow/application/validation"

export const dynamic = "force-dynamic"

function authorized(request: Request): boolean {
  const expected = process.env.DEVICE_INGESTION_SECRET
  const supplied = request.headers.get("x-device-ingestion-key")
  if (!expected || !supplied) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 })
  let body: unknown
  try {
    const text = await request.text()
    if (text.length > 8_192) return Response.json({ error: "payload too large" }, { status: 413 })
    body = JSON.parse(text)
  } catch { return Response.json({ error: "invalid JSON" }, { status: 400 }) }
  const validation = validateDeviceReadingPayload(body)
  if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 })
  try {
    const result = await ingestDeviceReading(validation.data)
    if (result.status === "unknown_device") return Response.json({ error: "unknown device" }, { status: 404 })
    return Response.json({ accepted: result.status === "accepted", duplicate: result.status === "duplicate" }, { status: result.status === "duplicate" ? 200 : 201 })
  } catch { return Response.json({ error: "ingestion unavailable" }, { status: 503 }) }
}
