/** Display-only date formatting (es). Never feeds any evaluation. */

function valid(iso: string): Date | null {
  const date = new Date(iso)
  return Number.isFinite(date.getTime()) ? date : null
}

/** "8 oct" */
export function formatShortDate(iso: string): string {
  const date = valid(iso)
  return date ? date.toLocaleDateString("es", { day: "numeric", month: "short" }).replace(".", "") : "—"
}

/** "8 oct 2026" */
export function formatDate(iso: string): string {
  const date = valid(iso)
  return date ? date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "") : "—"
}

/** "8 oct, 14:05" */
export function formatDateTime(iso: string): string {
  const date = valid(iso)
  if (!date) return "—"
  const day = date.toLocaleDateString("es", { day: "numeric", month: "short" }).replace(".", "")
  const time = date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${day}, ${time}`
}

/** Machine-readable value for <time dateTime>. */
export function isoOrUndefined(iso: string): string | undefined {
  const date = valid(iso)
  return date ? date.toISOString() : undefined
}

/** "Hoy", "Ayer" or "8 oct" for a timeline group heading (local calendar days). */
export function formatDayHeading(ms: number, now: number = Date.now()): string {
  const start = (value: number) => {
    const d = new Date(value)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  const diffDays = Math.round((start(now) - start(ms)) / 86_400_000)
  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  return new Date(ms).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")
}

/** "14:05" */
export function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false })
}
