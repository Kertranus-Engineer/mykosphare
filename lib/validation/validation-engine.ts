export type ValidationSourceType =
  | "event"
  | "observation"
  | "trend"
  | "recommendation"
  | "proposal"

export type ValidationStatus =
  | "pending"
  | "confirmed"
  | "rejected"

export interface ValidationRecord {
  id: string
  timestamp: string
  sourceId: string
  sourceType: ValidationSourceType
  sourceTitle: string
  status: ValidationStatus
  notes?: string
}

const STATUS_COLORS = {
  pending: "text-muted-foreground/50",
  confirmed: "text-emerald-500",
  rejected: "text-red-500",
} as const

const STATUS_BG = {
  pending: "bg-muted/20 border-muted/30",
  confirmed: "bg-emerald-500/10 border-emerald-500/20",
  rejected: "bg-red-500/10 border-red-500/20",
} as const

const STATUS_DOT = {
  pending: "bg-muted-foreground/40",
  confirmed: "bg-emerald-500",
  rejected: "bg-red-500",
} as const

export { STATUS_COLORS, STATUS_BG, STATUS_DOT }

let recordCounter = 0

function nextRecordId(): string {
  return `val-${Date.now().toString(36)}-${(recordCounter++).toString(36).padStart(4, "0")}`
}

export function createValidationRecord(
  sourceId: string,
  sourceType: ValidationSourceType,
  sourceTitle: string,
  status: ValidationStatus,
  notes?: string,
): ValidationRecord {
  return {
    id: nextRecordId(),
    timestamp: new Date().toISOString(),
    sourceId,
    sourceType,
    sourceTitle,
    status,
    notes,
  }
}

export interface ValidationStats {
  total: number
  confirmed: number
  rejected: number
  pending: number
}

export function computeValidationStats(records: ValidationRecord[]): ValidationStats {
  return {
    total: records.length,
    confirmed: records.filter((r) => r.status === "confirmed").length,
    rejected: records.filter((r) => r.status === "rejected").length,
    pending: records.filter((r) => r.status === "pending").length,
  }
}

export function getValidationForSource(
  records: ValidationRecord[],
  sourceId: string,
): ValidationRecord | undefined {
  return records.find((r) => r.sourceId === sourceId)
}
