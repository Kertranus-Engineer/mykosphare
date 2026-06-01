"use client"

import { useState } from "react"
import { Bot, ChevronDown } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function AIRecommendationsPanel() {
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="size-4 text-muted-foreground" />
          AI Recommendations
          <ChevronDown className={cn("ml-auto size-4 text-muted-foreground/50 transition-transform", open && "rotate-180")} />
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/20">
              <Bot className="size-5 text-muted-foreground/30" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground/50">No live recommendations available</p>
              <p className="text-xs text-muted-foreground/30">Awaiting visual analysis engine</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
