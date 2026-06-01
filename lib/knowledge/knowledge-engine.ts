export type KnowledgeSourceType =
  | "event"
  | "observation"
  | "trend"
  | "recommendation"
  | "proposal"
  | "validation"

export interface KnowledgeRecord {
  id: string
  timestamp: string
  sourceType: KnowledgeSourceType
  title: string
  summary: string
  severity?: string
}

const STORAGE_KEY = "mykosphare-knowledge"

let recordCounter = Date.now()

function nextRecordId(): string {
  return `knw-${(recordCounter++).toString(36)}`
}

export function createKnowledgeRecord(
  sourceType: KnowledgeSourceType,
  title: string,
  summary: string,
  timestamp?: string,
  severity?: string,
): KnowledgeRecord {
  return {
    id: nextRecordId(),
    timestamp: timestamp ?? new Date().toISOString(),
    sourceType,
    title,
    summary,
    severity,
  }
}

const SOURCE_LABELS: Record<KnowledgeSourceType, string> = {
  event: "Event",
  observation: "Observation",
  trend: "Trend",
  recommendation: "Recommendation",
  proposal: "Proposal",
  validation: "Validation",
}

export { SOURCE_LABELS }

export interface KnowledgeArchiveInput {
  events: Array<{ title: string; description: string; severity: string; timestamp: string }>
  observations: Array<{ title: string; summary: string; severity: string; timestamp: string }>
  trends: Array<{ title: string; summary: string; direction: string; timestamp: string }>
  recommendations: Array<{ title: string; description: string; priority: string; timestamp: string }>
  proposals: Array<{ parameter: string; expectedOutcome: string; confidence: number; timestamp: string }>
  validations: Array<{ sourceTitle: string; sourceType: string; status: string; timestamp: string }>
}

export function archiveSnapshot(input: KnowledgeArchiveInput): KnowledgeRecord[] {
  const records: KnowledgeRecord[] = []

  for (const e of input.events) {
    records.push(createKnowledgeRecord("event", e.title, e.description, e.timestamp, e.severity))
  }
  for (const o of input.observations) {
    records.push(createKnowledgeRecord("observation", o.title, o.summary, o.timestamp, o.severity))
  }
  for (const t of input.trends) {
    records.push(createKnowledgeRecord("trend", t.title, t.summary, t.timestamp, t.direction))
  }
  for (const r of input.recommendations) {
    records.push(createKnowledgeRecord("recommendation", r.title, r.description, r.timestamp, r.priority))
  }
  for (const p of input.proposals) {
    records.push(createKnowledgeRecord("proposal", p.parameter, p.expectedOutcome, p.timestamp, `${p.confidence}%`))
  }
  for (const v of input.validations) {
    records.push(createKnowledgeRecord("validation", v.sourceTitle, `${v.sourceType} — ${v.status}`, v.timestamp, v.status))
  }

  return records
}

export interface KnowledgeStats {
  total: number
  bySource: Record<KnowledgeSourceType, number>
}

export function computeKnowledgeStats(records: KnowledgeRecord[]): KnowledgeStats {
  const bySource: Record<KnowledgeSourceType, number> = {
    event: 0,
    observation: 0,
    trend: 0,
    recommendation: 0,
    proposal: 0,
    validation: 0,
  }

  for (const r of records) {
    bySource[r.sourceType]++
  }

  return { total: records.length, bySource }
}

export function saveKnowledge(records: KnowledgeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // storage full or unavailable
  }
}

export function loadKnowledge(): KnowledgeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as KnowledgeRecord[]
  } catch {
    return []
  }
}

export function clearKnowledge(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable
  }
}

export function exportKnowledgeJSON(records: KnowledgeRecord[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
      source: "mykosphare-knowledge-layer",
      recordCount: records.length,
      records,
    },
    null,
    2,
  )
}

export function parseKnowledgeJSON(json: string): {
  success: boolean
  records: KnowledgeRecord[]
  error?: string
} {
  try {
    const parsed = JSON.parse(json)
    if (!parsed.records || !Array.isArray(parsed.records)) {
      return { success: false, records: [], error: "Invalid knowledge file: missing records array" }
    }
    const records: KnowledgeRecord[] = []
    for (const item of parsed.records) {
      if (!item.id || !item.sourceType || !item.title) continue
      records.push({
        id: String(item.id),
        timestamp: String(item.timestamp ?? new Date().toISOString()),
        sourceType: item.sourceType,
        title: String(item.title),
        summary: String(item.summary ?? ""),
        severity: item.severity ? String(item.severity) : undefined,
      })
    }
    return { success: true, records }
  } catch (e) {
    return { success: false, records: [], error: e instanceof Error ? e.message : "Failed to parse JSON" }
  }
}
