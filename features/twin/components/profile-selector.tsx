"use client"

import { memo, useState } from "react"
import { Sprout, Plus, Check, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CultivationProfile } from "@/lib/twin/cultivation-profile"

interface ProfileSelectorProps {
  profiles: CultivationProfile[]
  activeProfile: CultivationProfile | null
  onSelect: (id: string) => void
  onAdd: () => void
}

export const ProfileSelector = memo(function ProfileSelector({
  profiles,
  activeProfile,
  onSelect,
  onAdd,
}: ProfileSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none pb-2"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sprout className="size-4 text-muted-foreground" />
          Cultivation Profiles
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {profiles.length} profile{profiles.length !== 1 ? "s" : ""}
          </span>
          <ChevronDown className={cn(
            "size-4 text-muted-foreground/50 transition-transform",
            open && "rotate-180",
          )} />
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="flex flex-col gap-2">
          {profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
              <Sprout className="size-6 text-muted-foreground/15" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground/50">No cultivation profiles</p>
                <p className="text-[10px] text-muted-foreground/30">Create a profile to associate data with a real-world entity</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAdd() }}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-500 hover:bg-emerald-500/10 transition-colors"
              >
                <Plus className="size-3" />
                Create Profile
              </button>
            </div>
          ) : (
            <>
              {profiles.map((profile) => {
                const isActive = activeProfile?.id === profile.id
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelect(profile.id) }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      isActive ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" : "hover:bg-muted/20",
                    )}
                  >
                    <div className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      isActive ? "bg-emerald-500/20" : "bg-muted/20",
                    )}>
                      <Sprout className={cn("size-4", isActive ? "text-emerald-500" : "text-muted-foreground/50")} />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-[11px] font-semibold text-foreground truncate">{profile.name}</span>
                      <span className="text-[9px] text-muted-foreground/50 truncate">
                        {profile.species}{profile.strain ? ` — ${profile.strain}` : ""}
                      </span>
                    </div>
                    {isActive && (
                      <Check className="size-4 text-emerald-500 shrink-0" />
                    )}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAdd() }}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-foreground/10 px-3 py-2 text-[11px] font-medium text-muted-foreground/50 hover:bg-muted/20 hover:text-muted-foreground transition-colors"
              >
                <Plus className="size-3" />
                Add New Profile
              </button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
})
