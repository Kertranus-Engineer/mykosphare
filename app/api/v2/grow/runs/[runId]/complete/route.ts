import { completeCultivation } from "@/lib/grow/application/lifecycle"
import { isStageId, isUuid, readJsonObject, statusFor } from "@/lib/grow/application/http"
import { createSupabaseGrowRepository } from "@/lib/grow/application/supabase-repository"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Complete / harvest a cultivation. { "finalStage"?: stage id, "yieldGrams"?: number, "notes"?: string }
 * Nothing is invented: yield is stored only if the grower entered it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const { runId } = await params
  if (!isUuid(runId)) return Response.json({ error: "invalid run id" }, { status: 400 })
  const parsed = await readJsonObject(request, ["finalStage", "yieldGrams", "notes"])
  if (!parsed.ok) return parsed.response
  const { finalStage, yieldGrams, notes } = parsed.body
  if (finalStage !== undefined && !isStageId(finalStage)) return Response.json({ error: "invalid finalStage" }, { status: 400 })

  try {
    const result = await completeCultivation({
      repository: createSupabaseGrowRepository(),
      ownerId: user.id,
      runId,
      finalStage,
      facts: {
        ...(yieldGrams !== undefined ? { yieldGrams: yieldGrams as number } : {}),
        ...(notes !== undefined ? { notes: notes as string } : {}),
      },
      now: new Date(),
    })
    return Response.json(result, { status: statusFor(result.status) })
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 })
  }
}
