import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { safeNext } from "@/lib/auth/safe-next"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.has("next") ? safeNext(searchParams.get("next"))
    : process.env.CLOUD_CONNECT_PREVIEW_ONLY === "1" ? "/home/conectar?view=real" : "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
}
