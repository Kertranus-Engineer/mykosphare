"use client"

import { useState, useCallback } from "react"
import { Camera, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function SystemSnapshot() {
  const [captured, setCaptured] = useState(false)
  const [timestamp, setTimestamp] = useState<string | null>(null)

  const capture = useCallback(() => {
    setTimestamp(new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }))
    setCaptured(true)
    setTimeout(() => setCaptured(false), 3000)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={capture}
        type="button"
        className={cn(
          "flex size-8 items-center justify-center rounded-lg transition-all duration-150",
          captured
            ? "bg-emerald-500/10 text-emerald-500"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        title="Capture System Snapshot"
      >
        {captured ? <CheckCircle2 className="size-4" /> : <Camera className="size-4" />}
      </button>
      {captured && timestamp && (
        <div className="flex items-center gap-1.5 animate-[fade-in-up_0.3s_ease-out]">
          <span className="text-[9px] text-emerald-500/70 font-mono tabular-nums">
            SNAPSHOT · {timestamp}
          </span>
        </div>
      )}
    </div>
  )
}
