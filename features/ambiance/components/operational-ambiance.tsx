"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useEnvironment } from "@/mock/environment"
import type { EnvState } from "@/mock/environment"

function useDebouncedEnvState(): EnvState {
  const env = useEnvironment()
  const [debounced, setDebounced] = useState<EnvState>(env.state)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(env.state), 300)
    return () => clearTimeout(t)
  }, [env.state])

  return debounced
}

export function OperationalAmbiance() {
  useEnvironment()
  const debounced = useDebouncedEnvState()

  const severityLevel = debounced === "WARNING" ? 2 : debounced === "RECOVERY" ? 1 : 0

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-0 transition-all duration-1000",
          debounced === "WARNING" && "animate-[status-glow-warning_4s_ease-in-out_infinite]",
          debounced === "RECOVERY" && "animate-[status-glow-recovery_4s_ease-in-out_infinite]"
        )}
      />

      {severityLevel >= 2 && (
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${
              debounced === "WARNING" ? "rgb(245, 158, 11)" : "rgb(239, 68, 68)"
            } 0%, transparent 70%)`,
          }}
        />
      )}

      {severityLevel >= 1 && (
        <div
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-0 h-1 opacity-50"
          style={{
            background: `linear-gradient(90deg, transparent, ${
              debounced === "WARNING"
                ? "rgb(245, 158, 11)"
                : debounced === "RECOVERY"
                  ? "rgb(20, 184, 166)"
                  : "rgb(239, 68, 68)"
            }, transparent)`,
            animation: "breathe 4s ease-in-out infinite",
          }}
        />
      )}
    </>
  )
}
