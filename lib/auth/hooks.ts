import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface OperatorInfo {
  email: string
  displayName: string
  role: string
}

function extractOperatorInfo(user: User): OperatorInfo {
  return {
    email: user.email ?? "unknown",
    displayName: (user.user_metadata?.display_name as string) ?? user.email?.split("@")[0] ?? "Operator",
    role: (user.user_metadata?.role as string) ?? "operator",
  }
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const operatorInfo: OperatorInfo | null = user ? extractOperatorInfo(user) : null

  return { user, operatorInfo, loading }
}
