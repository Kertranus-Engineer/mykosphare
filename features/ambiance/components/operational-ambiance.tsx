"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useRealEnvironment } from "@/lib/useEnvironment"
import type { EnvState } from "@/lib/useEnvironment"

function useDebouncedEnvState(): EnvState {
  const env = useRealEnvironment()
  const [debounced, setDebounced] = useState<EnvState>(env.state)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(env.state), 300)
    return () => clearTimeout(t)
  }, [env.state])
  return debounced
}

export function OperationalAmbiance() {
  useRealEnvironment()
  const debounced = useDebouncedEnvState()

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.15) 100%)",
        }}
      />

      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.012]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 3px)",
          backgroundSize: "100% 3px",
        }}
      />

      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.003]"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(16,185,129,0.15) 0%, transparent 60%)",
          animation: "breathe 8s ease-in-out infinite",
        }}
      />

      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-0 transition-all duration-1000",
          debounced === "CRITICAL" && "animate-[status-glow-critical_4s_ease-in-out_infinite]",
          debounced === "WARNING" && "animate-[status-glow-warning_4s_ease-in-out_infinite]",
          debounced === "RECOVERY" && "animate-[status-glow-recovery_4s_ease-in-out_infinite]"
        )}
      />

      {debounced !== "STABLE" && (
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.02] transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${
              debounced === "CRITICAL" ? "rgb(239, 68, 68)"
              : debounced === "WARNING" ? "rgb(245, 158, 11)"
              : debounced === "RECOVERY" ? "rgb(20, 184, 166)"
              : "rgb(59, 130, 246)"
            } 0%, transparent 70%)`,
          }}
        />
      )}

      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-0 h-px opacity-30 transition-all duration-700"
        style={{
          background: `linear-gradient(90deg, transparent, ${
            debounced === "CRITICAL" ? "rgb(239, 68, 68)"
            : debounced === "WARNING" ? "rgb(245, 158, 11)"
            : debounced === "RECOVERY" ? "rgb(20, 184, 166)"
            : "rgb(34, 197, 94)"
          }, transparent)`,
          animation: "breathe 4s ease-in-out infinite",
        }}
      />
    </>
  )
}
