import { createClient } from "@/lib/supabase/server"
import { getHomeReadings } from "@/lib/grow/application/home-read"
import { createHomeRepository } from "@/lib/grow/application/home-repository"
import { isUuid } from "@/lib/grow/application/http"

export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" }
  try {
    const db = await createClient()
    const { data: { user }, error } = await db.auth.getUser()
    if (error || !user) return Response.json({ status: "unauthorized" }, { status: 401, headers })
    const chamber = new URL(request.url).searchParams.get("chamber")
    if (chamber !== null && !isUuid(chamber)) return Response.json({ status: "not_found" }, { status: 404, headers })
    const result = await getHomeReadings(createHomeRepository(db), user.id, chamber ?? undefined)
    return Response.json(result, { status: result.status === "unavailable" ? 503 : result.status === "not_found" ? 404 : 200, headers })
  } catch { return Response.json({ status: "unavailable" }, { status: 503, headers }) }
}
