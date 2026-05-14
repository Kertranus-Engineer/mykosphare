import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

const VERSION = "0.1.0"

export async function GET(): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasSupabaseEnv = !!url && !!anonKey

  let supabase: "ok" | "missing_env" | "error" = "missing_env"
  let realtime: "ok" | "missing_env" | "error" = "missing_env"

  if (hasSupabaseEnv) {
    try {
      const client = createClient()
      const { error } = await client.from("telemetry").select("id", { count: "exact", head: true }).limit(1)
      supabase = error ? "error" : "ok"
    } catch {
      supabase = "error"
    }

    try {
      const client = createClient()
      const channel = client.channel("health-check")
      const subOk = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          client.removeChannel(channel)
          resolve(false)
        }, 5000)
        channel.subscribe((status) => {
          clearTimeout(timeout)
          client.removeChannel(channel)
          resolve(status === "SUBSCRIBED")
        })
      })
      realtime = subOk ? "ok" : "error"
    } catch {
      realtime = "error"
    }
  }

  return NextResponse.json({
    status: supabase === "ok" ? "ok" : "degraded",
    supabase,
    realtime,
    version: VERSION,
    timestamp: new Date().toISOString(),
  })
}
