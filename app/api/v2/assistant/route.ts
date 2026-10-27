import { analyzeHome } from "@/lib/grow/application/home-analysis"
import { getHomeReadings } from "@/lib/grow/application/home-read"
import { createHomeRepository } from "@/lib/grow/application/home-repository"
import { readAiConfig, type Turn } from "@/lib/grow/assistant/model"
import { answerMessage, createLimiter } from "@/lib/grow/assistant/service"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// Cost guard for the optional model: 10 calls per 10 minutes per person (per server instance).
const limiter = createLimiter(10, 10 * 60_000)
const headers = { "Cache-Control": "private, no-store" }

function parseTurns(value: unknown): Turn[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((t): t is Turn => !!t && typeof t === "object" && (t.role === "user" || t.role === "assistant") && typeof t.text === "string")
    .slice(-4)
    .map(t => ({ role: t.role, text: t.text.slice(0, 400) }))
}

/**
 * MYKO Assistant. The context is rebuilt HERE from the caller's own session and RLS-scoped data; nothing the browser
 * sends (beyond the question and a few previous turns) is trusted as a fact.
 */
export async function POST(request: Request) {
  try {
    const db = await createClient()
    const { data: { user }, error } = await db.auth.getUser()
    if (error || !user) return Response.json({ error: "unauthorized" }, { status: 401, headers })
    let body: unknown
    try { body = await request.json() } catch { return Response.json({ error: "invalid json" }, { status: 400, headers }) }
    const message = body && typeof body === "object" ? (body as Record<string, unknown>).message : undefined
    if (typeof message !== "string" || !message.trim() || message.length > 500) return Response.json({ error: "invalid message" }, { status: 400, headers })

    const home = await getHomeReadings(createHomeRepository(db), user.id, undefined, { includeHistory: true })
    if (home.status !== "ready") return Response.json({ error: home.status }, { status: home.status === "unavailable" ? 503 : 404, headers })
    const { context } = analyzeHome(home, home.history, Date.now())
    const reply = await answerMessage({ ai: readAiConfig(), limiter }, user.id, message.trim(), context, parseTurns((body as Record<string, unknown>).turns))
    return Response.json(reply, { headers })
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers })
  }
}
