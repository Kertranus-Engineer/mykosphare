import type { NodeStatus } from "./types"

export interface StatusVisual {
  color: string
  dotColor: string
  glowColor: string
  label: string
  animClass: string
}

export const STATUS_VISUALS: Record<NodeStatus, StatusVisual> = {
  online: {
    color: "text-emerald-500",
    dotColor: "bg-emerald-500",
    glowColor: "shadow-emerald-500/40",
    label: "Online",
    animClass: "animate-pulse",
  },
  offline: {
    color: "text-red-500",
    dotColor: "bg-red-500",
    glowColor: "shadow-red-500/40",
    label: "Offline",
    animClass: "",
  },
  degraded: {
    color: "text-amber-500",
    dotColor: "bg-amber-500",
    glowColor: "shadow-amber-500/40",
    label: "Degraded",
    animClass: "animate-pulse",
  },
  warning: {
    color: "text-orange-500",
    dotColor: "bg-orange-500",
    glowColor: "shadow-orange-500/40",
    label: "Warning",
    animClass: "animate-pulse",
  },
  syncing: {
    color: "text-blue-500",
    dotColor: "bg-blue-500",
    glowColor: "shadow-blue-500/40",
    label: "Syncing",
    animClass: "animate-pulse",
  },
  standby: {
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground",
    glowColor: "shadow-muted-foreground/20",
    label: "Standby",
    animClass: "",
  },
}

export function getStatusVisual(status: NodeStatus): StatusVisual {
  return STATUS_VISUALS[status] ?? STATUS_VISUALS.standby
}

export type { NodeStatus }
