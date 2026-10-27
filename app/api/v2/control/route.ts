import { readJsonObject } from "@/lib/grow/application/http"
import { publishOwnerConfig } from "@/lib/grow/control/handlers"
import { createSupabasePublishStore } from "@/lib/grow/control/store"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * The owner confirms exact environmental targets for their own device: { mode, targets, note? }.
 * Saved as a new desired version; nothing is "applied" until the device itself confirms it.
 * The device is resolved from the signed-in account on the server; no device id is accepted from the request.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })
  const parsed = await readJsonObject(request, ["mode", "targets", "note"])
  if (!parsed.ok) return parsed.response
  const result = await publishOwnerConfig({ store: createSupabasePublishStore(), ownerId: user.id, body: parsed.body })
  return Response.json(result.status === 201 ? { version: result.version } : { error: result.error }, { status: result.status, headers: { "Cache-Control": "no-store" } })
}
