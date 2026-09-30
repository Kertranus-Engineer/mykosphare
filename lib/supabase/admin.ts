import "server-only"
import { createClient } from "@supabase/supabase-js"

/** Server-only client for trusted route handlers and repositories. Never import into client code. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) throw new Error("Supabase server credentials are not configured")
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
}
