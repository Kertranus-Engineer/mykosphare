import { isUuid, readJsonObject } from "@/lib/grow/application/http"
import { parseTargets } from "@/lib/grow/application/targets"
import { setOwnerTargets } from "@/lib/grow/application/targets-store"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * A PERSON confirms the environmental ranges for the confirmed stage: { temperature: {min,max}, humidity: {min,max} }.
 * The source is the signed-in owner; no request can claim an AI or rules origin, and nothing here touches hardware.
 */
export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })
  const { runId } = await params
  if (!isUuid(runId)) return Response.json({ error: "invalid run id" }, { status: 400 })
  const parsed = await readJsonObject(request, ["temperature", "humidity"])
  if (!parsed.ok) return parsed.response
  const targets = parseTargets(parsed.body)
  if (!targets.ok) return Response.json({ error: targets.error }, { status: 422 })
  const result = await setOwnerTargets({ ownerId: user.id, runId, targets: targets.value })
  const status = result.status === "saved" ? 200 : result.status === "run_not_found" ? 404 : result.status === "run_not_active" ? 409 : 503
  return Response.json(result, { status })
}
