"use client"

import { memo } from "react"
import { Sprout, Calendar, Clock, FlaskConical, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CultivationProfile } from "@/lib/twin/cultivation-profile"
import { daysSinceInoculation, daysUntilHarvest } from "@/lib/twin/cultivation-profile"

interface CultivationSummaryCardProps {
  profile: CultivationProfile | null
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

export const CultivationSummaryCard = memo(function CultivationSummaryCard({
  profile,
}: CultivationSummaryCardProps) {
  if (!profile) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sprout className="size-4 text-muted-foreground" />
            Cultivation Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <Sprout className="size-5 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/40">No cultivation profile configured</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const daysSince = daysSinceInoculation(profile)
  const daysUntil = daysUntilHarvest(profile)

  return (
    <Card className="border-l-4 border-l-emerald-500/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sprout className="size-4 text-emerald-500/60" />
            {profile.name}
          </CardTitle>
          <span className="text-[10px] font-mono text-muted-foreground/40">{profile.id}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-3 text-muted-foreground/40 shrink-0" />
            <span className="text-[10px] text-muted-foreground/50">Species</span>
            <span className="ml-auto text-xs font-medium text-foreground/70">
              {profile.species}{profile.strain ? ` (${profile.strain})` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-3 text-muted-foreground/40 shrink-0" />
            <span className="text-[10px] text-muted-foreground/50">Inoculated</span>
            <span className="ml-auto text-xs font-medium text-foreground/70 tabular-nums">
              {formatDate(profile.inoculationDate)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-3 text-muted-foreground/40 shrink-0" />
            <span className="text-[10px] text-muted-foreground/50">Days Since Inoculation</span>
            <span className="ml-auto text-xs font-bold tabular-nums text-emerald-500">
              {daysSince}d
            </span>
          </div>
          {profile.expectedHarvestDate && (
            <div className="flex items-center gap-2">
              <Calendar className="size-3 text-muted-foreground/40 shrink-0" />
              <span className="text-[10px] text-muted-foreground/50">Expected Harvest</span>
              <span className="ml-auto text-xs font-medium text-foreground/70 tabular-nums">
                {formatDate(profile.expectedHarvestDate)}
                {daysUntil !== null && (
                  <span className={cn(
                    "ml-1.5 text-[10px] font-semibold",
                    daysUntil < 0 ? "text-red-500" : daysUntil <= 5 ? "text-amber-500" : "text-emerald-500",
                  )}>
                    ({daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {profile.notes && (
          <div className="flex items-start gap-1.5 rounded-lg bg-muted/10 px-2.5 py-2">
            <FileText className="size-3 text-muted-foreground/30 mt-0.5 shrink-0" />
            <p className="text-[10px] text-foreground/50 leading-relaxed">{profile.notes}</p>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 w-fit">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-medium text-emerald-500">Active monitoring</span>
        </div>
      </CardContent>
    </Card>
  )
})
