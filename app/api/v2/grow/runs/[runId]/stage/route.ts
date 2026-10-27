import { confirmCultivationStage } from "@/lib/grow/application/lifecycle"
import { isStageId, isUuid, readJsonObject, statusFor } from "@/lib/grow/application/http"
import { createSupabaseGrowRepository } from "@/lib/grow/application/supabase-repository"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * A HUMAN confirms the biological stage. { "stage": stage id }
 * The source is always `manual`: no request can declare an AI or vision source.
 */
export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const { runId } = await params
  if (!isUuid(runId)) return Response.json({ error: "invalid run id" }, { status: 400 })
  const parsed = await readJsonObject(request, ["stage"])
  if (!parsed.ok) return parsed.response
  if (!isStageId(parsed.body.stage)) return Response.json({ error: "invalid stage" }, { status: 400 })

  try {
    const result = await confirmCultivationStage({ repository: createSupabaseGrowRepository(), ownerId: user.id, runId, stage: parsed.body.stage, source: "manual", now: new Date() })
    return Response.json(result, { status: statusFor(result.status) })
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 })
  }
}
