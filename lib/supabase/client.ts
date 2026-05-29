import { createBrowserClient } from "@supabase/ssr"

let supabaseWritesEnabled = true
let supabaseDisabledLogged = false

export function isSupabaseWritesEnabled(): boolean {
  return supabaseWritesEnabled
}

export function disableSupabaseWrites(): void {
  if (supabaseWritesEnabled) {
    supabaseWritesEnabled = false
    if (!supabaseDisabledLogged) {
      supabaseDisabledLogged = true
      if (process.env.NODE_ENV === "development") {
        console.warn("[SUPABASE] Remote writes disabled. Falling back to local simulation.")
      }
    }
  }
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  return { url, key, configured: !!(url && key) }
}

export function createClient() {
  const { url, key, configured } = getSupabaseConfig()
  if (!configured) {
    throw new Error(
      "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "for realtime features, or use local simulation mode."
    )
  }
  return createBrowserClient(url, key)
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().configured
}
