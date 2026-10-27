import { startCultivation } from "@/lib/grow/application/lifecycle"
import { isStageId, isUuid, readJsonObject, statusFor } from "@/lib/grow/application/http"
import { createSupabaseGrowRepository } from "@/lib/grow/application/supabase-repository"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Start a cultivation in one of the caller's chambers.
 * { "chamberId": uuid, "profileId": uuid, "initialStage"?: stage id, "name"?: string }
 * Ownership is resolved server-side; one active run per chamber is the DB invariant.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const parsed = await readJsonObject(request, ["chamberId", "profileId", "initialStage", "name"])
  if (!parsed.ok) return parsed.response
  const { chamberId, profileId, initialStage, name } = parsed.body
  if (!isUuid(chamberId) || !isUuid(profileId)) return Response.json({ error: "chamberId and profileId must be ids" }, { status: 400 })
  if (initialStage !== undefined && !isStageId(initialStage)) return Response.json({ error: "invalid initialStage" }, { status: 400 })
  if (name !== undefined && (typeof name !== "string" || name.length > 120)) return Response.json({ error: "invalid name" }, { status: 400 })

  try {
    const result = await startCultivation({ repository: createSupabaseGrowRepository(), ownerId: user.id, chamberId, profileId, initialStage, name, now: new Date() })
    return Response.json(result, { status: statusFor(result.status) })
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 })
  }
}
