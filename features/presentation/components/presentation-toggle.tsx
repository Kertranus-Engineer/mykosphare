"use client"

import { Monitor, MonitorOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePresentationMode } from "./presentation-mode"

export function PresentationToggle() {
  const { enabled, toggle } = usePresentationMode()

  return (
    <button
      onClick={toggle}
      type="button"
      className={cn(
        "flex size-8 items-center justify-center rounded-lg transition-all duration-150",
        enabled
          ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      title={enabled ? "Exit Presentation Mode" : "Enter Presentation Mode"}
    >
      {enabled ? <MonitorOff className="size-4" /> : <Monitor className="size-4" />}
    </button>
  )
}
