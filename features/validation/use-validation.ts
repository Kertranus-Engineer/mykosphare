"use client"

import { useState, useCallback } from "react"
import type { Observation } from "@/lib/observations/observation-engine"
import type { Trend } from "@/lib/trends/trend-engine"
import type { Recommendation } from "@/lib/recommendations/recommendation-engine"
import {
  createValidationRecord,
  computeValidationStats,
  getValidationForSource,
  type ValidationRecord,
  type ValidationSourceType,
  type ValidationStatus,
  type ValidationStats,
} from "@/lib/validation/validation-engine"

interface UseValidationResult {
  records: ValidationRecord[]
  stats: ValidationStats
  confirmObservation: (observation: Observation) => void
  rejectObservation: (observation: Observation) => void
  confirmTrend: (trend: Trend) => void
  rejectTrend: (trend: Trend) => void
  confirmRecommendation: (rec: Recommendation) => void
  rejectRecommendation: (rec: Recommendation) => void
  getStatus: (sourceId: string) => ValidationStatus | null
}

export function useValidation(): UseValidationResult {
  const [records, setRecords] = useState<ValidationRecord[]>([])

  const safeRecords = records ?? []

  const addRecord = useCallback(
    (
      sourceId: string,
      sourceType: ValidationSourceType,
      sourceTitle: string,
      status: ValidationStatus,
      notes?: string,
    ) => {
      setRecords((prev) => {
        const filtered = prev.filter((r) => r.sourceId !== sourceId)
        return [...filtered, createValidationRecord(sourceId, sourceType, sourceTitle, status, notes)]
      })
    },
    [],
  )

  const confirmObservation = useCallback(
    (obs: Observation) => addRecord(obs.id, "observation", obs.title, "confirmed"),
    [addRecord],
  )

  const rejectObservation = useCallback(
    (obs: Observation) => addRecord(obs.id, "observation", obs.title, "rejected"),
    [addRecord],
  )

  const confirmTrend = useCallback(
    (trend: Trend) => addRecord(trend.id, "trend", trend.title, "confirmed"),
    [addRecord],
  )

  const rejectTrend = useCallback(
    (trend: Trend) => addRecord(trend.id, "trend", trend.title, "rejected"),
    [addRecord],
  )

  const confirmRecommendation = useCallback(
    (rec: Recommendation) => addRecord(rec.id, "recommendation", rec.title, "confirmed"),
    [addRecord],
  )

  const rejectRecommendation = useCallback(
    (rec: Recommendation) => addRecord(rec.id, "recommendation", rec.title, "rejected"),
    [addRecord],
  )

  const getStatus = useCallback(
    (sourceId: string): ValidationStatus | null => {
      const record = getValidationForSource(safeRecords, sourceId)
      return record?.status ?? null
    },
    [safeRecords],
  )

  const stats = computeValidationStats(safeRecords)

  return {
    records,
    stats,
    confirmObservation,
    rejectObservation,
    confirmTrend,
    rejectTrend,
    confirmRecommendation,
    rejectRecommendation,
    getStatus,
  }
}
