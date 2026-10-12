import type { EnvState } from "@/lib/useEnvironment"
import type { ActivitySeverity } from "./use-mobile-activity"
import type { ConnectionKind, DataSource } from "./use-mobile-telemetry"

/** Presentation-only colour tokens. Full class names so Tailwind can see them. */
export interface Tone {
  text: string
  bg: string
  border: string
  dot: string
  glow: string
}

const EMERALD: Tone = {
  text: "text-emerald-600 dark:text-emerald-400",
  bg: "bg-emerald-500/10",
  border: "border-emerald-500/25",
  dot: "bg-emerald-400",
  glow: "from-emerald-500/20",
}
const CYAN: Tone = {
  text: "text-cyan-600 dark:text-cyan-400",
  bg: "bg-cyan-500/10",
  border: "border-cyan-500/25",
  dot: "bg-cyan-400",
  glow: "from-cyan-500/20",
}
const TEAL: Tone = {
  text: "text-teal-600 dark:text-teal-400",
  bg: "bg-teal-500/10",
  border: "border-teal-500/25",
  dot: "bg-teal-400",
  glow: "from-teal-500/20",
}
const YELLOW: Tone = {
  text: "text-yellow-700 dark:text-yellow-400",
  bg: "bg-yellow-500/10",
  border: "border-yellow-500/25",
  dot: "bg-yellow-400",
  glow: "from-yellow-500/15",
}
const AMBER: Tone = {
  text: "text-amber-700 dark:text-amber-400",
  bg: "bg-amber-500/10",
  border: "border-amber-500/30",
  dot: "bg-amber-400",
  glow: "from-amber-500/20",
}
const ORANGE: Tone = {
  text: "text-orange-600 dark:text-orange-400",
  bg: "bg-orange-500/10",
  border: "border-orange-500/30",
  dot: "bg-orange-400",
  glow: "from-orange-500/20",
}
const RED: Tone = {
  text: "text-red-600 dark:text-red-400",
  bg: "bg-red-500/10",
  border: "border-red-500/30",
  dot: "bg-red-400",
  glow: "from-red-500/25",
}
const MUTED: Tone = {
  text: "text-muted-foreground",
  bg: "bg-muted/40",
  border: "border-border",
  dot: "bg-muted-foreground/50",
  glow: "from-muted-foreground/10",
}

const STATE_TONE: Record<EnvState, Tone> = {
  STABLE: EMERALD,
  OPTIMIZING: CYAN,
  PRE_WARNING: YELLOW,
  WARNING: AMBER,
  ESCALATION: ORANGE,
  CRITICAL: RED,
  RECOVERY: TEAL,
}

/** Tone for the environment hero. Simulated and offline data never look "healthy-real". */
export function heroTone(state: EnvState, source: DataSource, connection: ConnectionKind): Tone {
  if (connection === "offline" || connection === "connecting" || source === "none") return MUTED
  if (source === "simulated") return AMBER
  return STATE_TONE[state]
}

export function sourceTone(source: DataSource): Tone {
  if (source === "live") return EMERALD
  if (source === "simulated") return AMBER
  return MUTED
}

export function connectionTone(kind: ConnectionKind): Tone {
  switch (kind) {
    case "live": return EMERALD
    case "simulated": return AMBER
    case "degraded":
    case "stale": return AMBER
    case "offline": return RED
    default: return MUTED
  }
}

export function severityTone(sev: ActivitySeverity): Tone {
  switch (sev) {
    case "critical": return RED
    case "warning": return AMBER
    case "success": return EMERALD
    default: return CYAN
  }
}
