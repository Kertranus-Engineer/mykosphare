"use client"

import { useState, useCallback } from "react"
import type { EnvironmentalEvent } from "@/lib/events/event-engine"
import type { Observation } from "@/lib/observations/observation-engine"
import type { Trend } from "@/lib/trends/trend-engine"
import type { Recommendation } from "@/lib/recommendations/recommendation-engine"
import type { ActionProposal } from "@/lib/actions/action-proposal-engine"
import type { ValidationRecord } from "@/lib/validation/validation-engine"
import {
  archiveSnapshot,
  saveKnowledge,
  loadKnowledge,
  clearKnowledge as clearStoredKnowledge,
  exportKnowledgeJSON,
  parseKnowledgeJSON,
  computeKnowledgeStats,
  type KnowledgeRecord,
  type KnowledgeStats,
  type KnowledgeArchiveInput,
} from "@/lib/knowledge/knowledge-engine"

interface UseKnowledgeResult {
  records: KnowledgeRecord[]
  stats: KnowledgeStats
  archive: () => void
  exportJSON: () => string
  importJSON: (json: string) => { success: boolean; error?: string }
  clear: () => void
  archiveCount: number
}

export function useKnowledge(input: {
  events?: EnvironmentalEvent[]
  observations?: Observation[]
  trends?: Trend[]
  recommendations?: Recommendation[]
  proposals?: ActionProposal[]
  validations?: ValidationRecord[]
}): UseKnowledgeResult {
  const safeInput = {
    events: input?.events ?? [],
    observations: input?.observations ?? [],
    trends: input?.trends ?? [],
    recommendations: input?.recommendations ?? [],
    proposals: input?.proposals ?? [],
    validations: input?.validations ?? [],
  }
  const [records, setRecords] = useState<KnowledgeRecord[]>(() => loadKnowledge())
  const [archiveCount, setArchiveCount] = useState(0)

  const archive = useCallback(() => {
    const archiveInput: KnowledgeArchiveInput = {
      events: safeInput.events.map((e) => ({
        title: e.title,
        description: e.description,
        severity: e.severity,
        timestamp: e.timestamp,
      })),
      observations: safeInput.observations.map((o) => ({
        title: o.title,
        summary: o.summary,
        severity: o.severity,
        timestamp: o.timestamp,
      })),
      trends: safeInput.trends.map((t) => ({
        title: t.title,
        summary: t.summary,
        direction: t.direction,
        timestamp: t.endTime,
      })),
      recommendations: safeInput.recommendations.map((r) => ({
        title: r.title,
        description: r.description,
        priority: r.priority,
        timestamp: r.timestamp,
      })),
      proposals: safeInput.proposals.map((p) => ({
        parameter: p.parameter,
        expectedOutcome: p.expectedOutcome,
        confidence: p.confidence,
        timestamp: new Date().toISOString(),
      })),
      validations: safeInput.validations.map((v) => ({
        sourceTitle: v.sourceTitle,
        sourceType: v.sourceType,
        status: v.status,
        timestamp: v.timestamp,
      })),
    }

    const newRecords = archiveSnapshot(archiveInput)
    setRecords((prev) => {
      const merged = [...prev, ...newRecords]
      saveKnowledge(merged)
      return merged
    })
    setArchiveCount((c) => c + 1)
  }, [safeInput])

  const exportJSON = useCallback(() => exportKnowledgeJSON(records), [records])

  const importJSON = useCallback((json: string) => {
    const result = parseKnowledgeJSON(json)
    if (result.success) {
      const merged = [...records, ...result.records]
      setRecords(merged)
      saveKnowledge(merged)
    }
    return result
  }, [records])

  const clear = useCallback(() => {
    setRecords([])
    clearStoredKnowledge()
    setArchiveCount(0)
  }, [])

  const stats = computeKnowledgeStats(records)

  return {
    records,
    stats,
    archive,
    exportJSON,
    importJSON,
    clear,
    archiveCount,
  }
}
