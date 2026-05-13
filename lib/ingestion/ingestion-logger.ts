import type { IngestionEventType } from "./schemas"

export interface IngestionLogEntry {
  id: string
  timestamp: string
  eventType: IngestionEventType
  source: string
  accepted: boolean
  reason?: string
  normalized?: boolean
}

const MAX_INGESTION_LOGS = 200
const STORAGE_KEY = "mykosphare_ingestion_logs"

const ingestionLogs: IngestionLogEntry[] = []

function loadPersistedLogs(): IngestionLogEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as IngestionLogEntry[]) : []
  } catch {
    return []
  }
}

function persistLogs() {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(ingestionLogs.slice(0, MAX_INGESTION_LOGS))
    )
  } catch {}
}

export function logIngestionEvent(entry: Omit<IngestionLogEntry, "id" | "timestamp">): void {
  const logEntry: IngestionLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  }
  ingestionLogs.unshift(logEntry)

  if (ingestionLogs.length > MAX_INGESTION_LOGS) {
    ingestionLogs.length = MAX_INGESTION_LOGS
  }

  persistLogs()
}

export function getIngestionLogs(limit = 50): IngestionLogEntry[] {
  if (ingestionLogs.length === 0) {
    const persisted = loadPersistedLogs()
    ingestionLogs.push(...persisted)
  }
  return ingestionLogs.slice(0, limit)
}

export function clearIngestionLogs(): void {
  ingestionLogs.length = 0
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }
}
