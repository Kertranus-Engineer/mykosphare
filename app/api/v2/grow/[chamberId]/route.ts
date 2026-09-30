import { createClient } from "@/lib/supabase/server"
import { createSupabaseGrowRepository } from "@/lib/grow/application/supabase-repository"
import { getGrowSnapshot } from "@/lib/grow/application/service"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ chamberId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })
  const { chamberId } = await params
  const mode = new URL(request.url).searchParams.get("mode") === "simulation" ? "simulation" : "real"
  const result = await getGrowSnapshot({ repository: createSupabaseGrowRepository(), chamberId, ownerId: user.id, now: new Date(), mode })
  const status = result.status === "ready" ? 200 : result.status === "not_found" ? 404 : result.status === "unavailable" ? 503 : 409
  return Response.json(result, { status })
}
