import {
  Camera,
  Cpu,
  Flag,
  Layers,
  NotebookPen,
  Thermometer,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { HistoryCategory, Tone } from "../../data/model"

/** Icon and wording for each kind of record, shared by the logbook and the history timeline. */
export const CATEGORY_ICON: Record<HistoryCategory, LucideIcon> = {
  milestone: Flag,
  stage: Layers,
  photo: Camera,
  observation: NotebookPen,
  environment: Thermometer,
  device: Cpu,
  alert: TriangleAlert,
  session: Zap,
}

export const CATEGORY_LABEL: Record<HistoryCategory, string> = {
  milestone: "Hito",
  stage: "Etapa",
  photo: "Fotografía",
  observation: "Observación",
  environment: "Ambiente",
  device: "Dispositivo",
  alert: "Alerta",
  session: "Sesión",
}

/** Round tonal icon used as the marker of a timeline entry. */
export function EntryIcon({ category, tone, className }: { category: HistoryCategory; tone: Tone; className?: string }) {
  const Icon = CATEGORY_ICON[category]
  return (
    <span aria-hidden className={cn("hv2-entry-icon", className)} data-tone={tone}>
      <Icon className="size-[18px]" />
    </span>
  )
}
