"use client"

import { GROW_COPY } from "@/lib/grow/presentation"

const DAY_MS = 24 * 60 * 60 * 1000

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/**
 * Time in the viewer's timezone: "14:12" today, "ayer 09:52" yesterday, a
 * short date ("20 sep") for anything older. Client-rendered only.
 */
export function LocalTime({ iso, now }: { iso: string; now: string }) {
  const at = new Date(iso)
  if (!Number.isFinite(at.getTime())) return <time>--</time>
  const clock = at.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false })
  const dayDiff = Math.round((startOfLocalDay(new Date(now)) - startOfLocalDay(at)) / DAY_MS)
  const label =
    dayDiff === 0 ? clock
      : dayDiff === 1 ? `${GROW_COPY.time.yesterday} ${clock}`
        : at.toLocaleDateString("es", { day: "numeric", month: "short" })
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {label}
    </time>
  )
}
