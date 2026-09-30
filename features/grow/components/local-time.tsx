"use client"

import { GROW_COPY } from "@/lib/grow/presentation"

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Clock time in the viewer's timezone; prefixes "ayer" when not today. Client-rendered only. */
export function LocalTime({ iso, now }: { iso: string; now: string }) {
  const at = new Date(iso)
  if (!Number.isFinite(at.getTime())) return <time>--</time>
  const clock = at.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false })
  const reference = new Date(now)
  const prefix = sameLocalDay(at, reference) ? "" : `${GROW_COPY.time.yesterday} `
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {prefix}
      {clock}
    </time>
  )
}
