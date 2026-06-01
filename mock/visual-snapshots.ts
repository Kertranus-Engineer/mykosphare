"use client"

import { useSyncExternalStore, useState, useCallback, useMemo } from "react"
import { computeGrowth, computeDaysBetween } from "@/lib/visual-intelligence/growth-engine"
import { computeDifference } from "@/lib/visual-intelligence/difference-engine"
import type { DifferenceLevel } from "@/lib/visual-intelligence/difference-engine"
import type { GrowthStage, CaptureSource, AnalysisStatus } from "@/lib/visual-intelligence/storage"
import type { CameraCaptureEntry } from "@/lib/visual-intelligence/camera-upload-schema"

export type { GrowthStage, CaptureSource, AnalysisStatus } from "@/lib/visual-intelligence/storage"
export type { VisualCapture, CaptureSession } from "@/lib/visual-intelligence/storage"
export type { DifferenceLevel } from "@/lib/visual-intelligence/difference-engine"
export type { CameraCaptureEntry } from "@/lib/visual-intelligence/camera-upload-schema"

export type VisualStatus = "healthy" | "warning" | "critical"
export type GrowthTrend = "accelerating" | "stable" | "slowing" | "unknown"
export type DataSource = "demo" | "test" | "real"
export type AnalysisSource = "mock-engine" | "visual-ai" | "human-review"

export interface ImageStats {
  width?: number
  height?: number
  fileSize?: number
  format?: string
}

export interface VisualSnapshot {
  id: string
  timestamp: string
  capturedAt: string
  imageUrl: string | null
  captureNumber: number
  analysisSource: AnalysisSource
  analysisStatus: AnalysisStatus
  source: CaptureSource
  sessionId?: string
  temperature: number
  humidity: number
  co2: number
  observation: string
  confidence: number
  status: VisualStatus
  imageStats?: ImageStats
  differenceLevel?: DifferenceLevel | null
  visualChange?: string
  growthTrend?: GrowthTrend
  growthProgress?: number
  growthStage?: GrowthStage
  growthPercent?: number
  indicators?: string[]
}

type DataChangeCallback = () => void

const OBSERVATIONS: Record<GrowthStage, string[]> = {
  inoculation: [
    "Initial spores deposited across substrate surface. White inoculation points clearly visible under 10x magnification. Surface moisture retention optimal.",
    "Spore germination confirmed at all injection sites. No contamination indicators present. Environmental parameters stable within inoculation protocol tolerances.",
  ],
  colonization: [
    "Mycelial expansion detected radiating from inoculation points. Rhizomorphic growth pattern consistent with healthy colonization phase.",
    "White mycelial mat expanding uniformly across substrate. No sectoring or bacterial blotch observed. Growth rate within expected range at current temperature profile.",
    "Active colonization confirmed across 78% of substrate surface. Hyphal density increasing steadily. CO2 levels consistent with respiratory demands of colonizing mycelium.",
  ],
  consolidation: [
    "Full substrate colonization achieved. Mycelial network shows uniform density with strong rhizomorphic characteristics. Ready for fruiting condition initiation.",
    "Consolidation phase complete. Hyphal knotting beginning in multiple quadrants. Substrate fully bound by mycelial matrix.",
  ],
  primordia: [
    "Primordia formation detected across substrate. Pinheads visible in 6 distinct clusters. Humidity and FAE parameters adjusted for fruiting initiation.",
    "Primordial development progressing normally. Even distribution of pin sets across fruiting surface. No abort indicators present.",
  ],
  fruiting: [
    "Active fruiting phase confirmed. Multiple fruit bodies developing with consistent morphology. Stem elongation and cap expansion within expected biometric parameters.",
    "Fruiting body development advancing steadily. Veil formation beginning on larger specimens. Environmental stability critical during this growth phase.",
    "Fruit maturation approaching optimal harvest window. Cap expansion approaching 80% completion. Spore drop not yet initiated.",
  ],
  harvest: [
    "Harvest window open. Multiple specimens at optimal maturity. Veils beginning to separate on largest fruits. Recommend harvest within 12 hours.",
    "Peak maturity achieved across fruiting cluster. Cap margins expanding. Optimal harvest conditions confirmed. Yield estimate within projected range.",
  ],
}

const INDICATORS: Record<GrowthStage, string[]> = {
  inoculation: ["Spore germination confirmed", "Substrate moisture optimal", "No contamination detected", "Temperature within range"],
  colonization: ["Rhizomorphic growth confirmed", "Mycelial density increasing", "Even colonization pattern", "CO2:O2 balance nominal"],
  consolidation: ["Uniform coverage achieved", "No sectoring present", "Ready for fruiting conditions", "Hyphal network dense"],
  primordia: ["Pinheads visible", "Even distribution confirmed", "Surface moisture maintained", "FAE rate adjusted"],
  fruiting: ["Fruit expansion steady", "Color within normal range", "No contamination signs", "Veil integrity maintained"],
  harvest: ["Optimal maturity reached", "Veils beginning to separate", "Harvest recommended within 12–24h", "Spore print viable"],
}

const DEMO_DAYS: { day: number; file: string; temp: number; hum: number; co2: number; conf: number }[] = [
  { day: 1, file: "day-01.svg", temp: 24.2, hum: 62.0, co2: 402, conf: 88 },
  { day: 2, file: "day-03.svg", temp: 24.4, hum: 61.5, co2: 404, conf: 90 },
  { day: 3, file: "day-03.svg", temp: 24.5, hum: 61.2, co2: 406, conf: 91 },
  { day: 4, file: "day-05.svg", temp: 24.4, hum: 60.8, co2: 409, conf: 89 },
  { day: 5, file: "day-05.svg", temp: 24.3, hum: 60.4, co2: 412, conf: 93 },
  { day: 6, file: "day-07.svg", temp: 24.2, hum: 59.8, co2: 416, conf: 94 },
  { day: 7, file: "day-07.svg", temp: 24.1, hum: 59.2, co2: 420, conf: 92 },
  { day: 8, file: "day-09.svg", temp: 24.0, hum: 58.7, co2: 424, conf: 95 },
  { day: 9, file: "day-09.svg", temp: 23.9, hum: 58.4, co2: 428, conf: 96 },
  { day: 10, file: "day-12.svg", temp: 23.8, hum: 58.0, co2: 432, conf: 94 },
  { day: 11, file: "day-12.svg", temp: 23.7, hum: 57.6, co2: 436, conf: 97 },
  { day: 12, file: "day-12.svg", temp: 23.6, hum: 57.2, co2: 440, conf: 98 },
]

const BASE_DATE = new Date(2026, 4, 25, 7, 0, 0)

interface DatasetEntry {
  id: string
  imageUrl: string
  day: number
  temperature: number
  humidity: number
  co2: number
  confidence: number
  source: string
}

function buildSnapshot(
  entry: DatasetEntry,
  index: number,
  total: number,
  previousEntries: DatasetEntry[],
  sessionId: string,
  analysisSource: AnalysisSource,
): VisualSnapshot {
  const captured = new Date(BASE_DATE.getTime() + entry.day * 24 * 60 * 60 * 1000)
  const daysSinceStart = computeDaysBetween(BASE_DATE.toISOString(), captured.toISOString())
  const growth = computeGrowth(daysSinceStart)

  const obs = OBSERVATIONS[growth.stage]?.[index % OBSERVATIONS[growth.stage].length] ?? "Growth monitoring in progress."
  const indicators: string[] = INDICATORS[growth.stage] ?? []

  const prevDay = index > 0 ? previousEntries[index - 1]?.day ?? 0 : 0
  const prevGrowth = index > 0
    ? computeGrowth(computeDaysBetween(BASE_DATE.toISOString(), new Date(BASE_DATE.getTime() + prevDay * 24 * 60 * 60 * 1000).toISOString()))
    : null
  const change = growth.progress - (prevGrowth?.progress ?? 0)
  const trend: GrowthTrend = change >= 15 ? "accelerating" : change >= 8 ? "stable" : "slowing"

  const visualChange =
    index === 0
      ? undefined
      : change >= 15
        ? `Significant growth advancement detected — progress +${change}% since previous capture. New hyphal structures visible.`
        : change >= 8
          ? `Steady visual progression observed — growth advancing as expected. Rhizomorphic density increasing.`
          : `Minor visual changes detected — consolidation phase stabilizing before next growth surge.`

  const difference =
    index > 0 && previousEntries[index - 1]?.imageUrl
      ? computeDifference(
          { imageUrl: entry.imageUrl },
          { imageUrl: previousEntries[index - 1].imageUrl },
        )
      : null

  const imageStats: ImageStats = {
    format: entry.imageUrl.split(".").pop()?.toUpperCase() ?? "JPG",
  }

  const mon = captured.toLocaleDateString("en-US", { month: "short" })
  const day = captured.getDate()

  return {
    id: entry.id,
    timestamp: `${mon} ${day} 07:00`,
    capturedAt: captured.toISOString(),
    imageUrl: entry.imageUrl,
    captureNumber: index + 1,
    analysisSource,
    analysisStatus: "completed",
    source: (entry.source as CaptureSource) ?? "manual",
    sessionId,
    temperature: entry.temperature,
    humidity: entry.humidity,
    co2: entry.co2,
    observation: obs,
    confidence: entry.confidence,
    status: "healthy",
    imageStats,
    differenceLevel: difference?.level ?? null,
    visualChange,
    growthTrend: trend,
    growthProgress: growth.progress,
    growthStage: growth.stage,
    growthPercent: growth.progress,
    indicators,
  }
}

function generateDemoSnapshots(): VisualSnapshot[] {
  const entries: VisualSnapshot[] = []
  for (let i = 0; i < DEMO_DAYS.length; i++) {
    const d: DatasetEntry = {
      id: `snap-${String(i + 1).padStart(4, "0")}`,
      imageUrl: `/demo-growth/${DEMO_DAYS[i].file}`,
      day: DEMO_DAYS[i].day,
      temperature: DEMO_DAYS[i].temp,
      humidity: DEMO_DAYS[i].hum,
      co2: DEMO_DAYS[i].co2,
      confidence: DEMO_DAYS[i].conf,
      source: "manual",
    }
    entries.push(buildSnapshot(d, i, DEMO_DAYS.length, entries as unknown as DatasetEntry[], "session-demo-001", "mock-engine"))
  }
  return entries
}

function generateSnapshotsFromTestData(data: DatasetEntry[]): VisualSnapshot[] {
  const entries: VisualSnapshot[] = []
  for (let i = 0; i < data.length; i++) {
    entries.push(buildSnapshot(data[i], i, data.length, data, "session-test-001", "mock-engine"))
  }
  return entries
}

function generateSnapshotsFromRealData(data: CameraCaptureEntry[]): VisualSnapshot[] {
  const datasetEntries: DatasetEntry[] = data.map((entry, i) => ({
    id: entry.id,
    imageUrl: entry.imageUrl,
    day: i + 1,
    temperature: 24.2 - i * 0.1,
    humidity: 62.0 - i * 0.8,
    co2: 400 + i * 5,
    confidence: 85 + Math.min(13, i * 2),
    source: entry.source,
  }))

  const entries: VisualSnapshot[] = []
  for (let i = 0; i < datasetEntries.length; i++) {
    entries.push(buildSnapshot(datasetEntries[i], i, datasetEntries.length, datasetEntries, "session-real-001", "human-review"))
  }
  return entries
}

async function loadTestDataset() {
  try {
    const res = await fetch("/data/test-growth.json")
    if (!res.ok) return
    const data: DatasetEntry[] = await res.json()
    demoSnapshots = generateSnapshotsFromTestData(data)
    notify()
  } catch {
    // dataset unavailable
  }
}

async function loadRealDataset() {
  try {
    const res = await fetch("/data/real-captures.json")
    if (!res.ok) return
    const data: CameraCaptureEntry[] = await res.json()
    demoSnapshots = generateSnapshotsFromRealData(data)
    notify()
  } catch {
    // dataset unavailable
  }
}

let demoSnapshots: VisualSnapshot[] = generateDemoSnapshots()
let dataSource: DataSource = "demo"
const listeners = new Set<DataChangeCallback>()

function subscribe(listener: DataChangeCallback) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function notify() {
  listeners.forEach((l) => l())
}

export function getSnapshots(): VisualSnapshot[] {
  return demoSnapshots
}

export function getSnapshotById(id: string): VisualSnapshot | undefined {
  return demoSnapshots.find((s) => s.id === id)
}

export function getDataSource(): DataSource {
  return dataSource
}

export function setDataSource(source: DataSource) {
  dataSource = source
  if (source === "demo") {
    demoSnapshots = generateDemoSnapshots()
    notify()
  } else if (source === "test") {
    demoSnapshots = []
    notify()
    loadTestDataset()
  } else if (source === "real") {
    demoSnapshots = []
    notify()
    loadRealDataset()
  }
}

export function regenerateSnapshots() {
  demoSnapshots = generateDemoSnapshots()
  notify()
}

export function useSnapshots(): VisualSnapshot[] {
  return useSyncExternalStore(subscribe, getSnapshots, getSnapshots)
}

export function useDataSource(): [DataSource, (s: DataSource) => void] {
  const current = useSyncExternalStore(subscribe, getDataSource, getDataSource)
  return [current, setDataSource]
}

export function useSnapshotsWindow(pageSize: number) {
  const all = useSnapshots()
  const [page, setPage] = useState(0)

  const items = useMemo(() => {
    const start = page * pageSize
    return all.slice(start, start + pageSize)
  }, [all, page, pageSize])

  const total = all.length
  const hasMore = (page + 1) * pageSize < total

  const loadMore = useCallback(() => {
    setPage((p) => p + 1)
  }, [])

  const reset = useCallback(() => {
    setPage(0)
  }, [])

  return { items, total, hasMore, loadMore, reset, all }
}
