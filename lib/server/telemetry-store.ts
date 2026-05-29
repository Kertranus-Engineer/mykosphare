/**
 * MYKOSPHARE — Server-Side Telemetry Store
 *
 * ÚNICA fuente de verdad para datos de telemetry.
 * Usa globalThis para sobrevivir HMR y cold-starts en Next.js App Router.
 *
 * SIN globalThis, `let latestData` en route.ts se resetea cada vez
 * que el módulo es reimportado (HMR en dev, nueva lambda en prod).
 */

import { generateSimulatedTelemetry } from "./simulator"
import type { SimulatedTelemetry } from "./simulator"

export interface TelemetryRecord {
  temp: number
  hum: number
  fan: boolean | null
  humidifier: boolean | null
  heartbeat: string | null
  rawTimestamp: string | null
  serverReceivedAt: string | null
}

export type TelemetrySource = "live" | "simulated" | "none"

const SIMULATION_TIMEOUT_MS = 15000

export interface TelemetryStore {
  latest: TelemetryRecord
  postCount: number
  errorCount: number
  createdAt: string
  lastRealDataAt: string | null
  demoData: { temp: number; hum: number; postedAt: string } | null
}

function createEmptyRecord(): TelemetryRecord {
  return {
    temp: 0,
    hum: 0,
    fan: null,
    humidifier: null,
    heartbeat: null,
    rawTimestamp: null,
    serverReceivedAt: null,
  }
}

function createStore(): TelemetryStore {
  return {
    latest: createEmptyRecord(),
    postCount: 0,
    errorCount: 0,
    createdAt: new Date().toISOString(),
    lastRealDataAt: null,
    demoData: null,
  }
}

const STORE_KEY = "__mykosphare_telemetry_v1" as const

interface GlobalWithStore {
  [STORE_KEY]: TelemetryStore
}

function getStore(): TelemetryStore {
  const g = globalThis as unknown as GlobalWithStore
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = createStore()
    console.log("[STORE] CREATED — new lifecycle at " + new Date().toISOString())
  }
  return g[STORE_KEY]
}

export function writeTelemetry(data: {
  temp: number
  hum: number
  fan?: boolean | null
  humidifier?: boolean | null
  rawTimestamp?: string | null
}): TelemetryRecord {
  const store = getStore()
  const now = new Date().toISOString()

  store.latest = {
    temp: data.temp,
    hum: data.hum,
    fan: data.fan ?? null,
    humidifier: data.humidifier ?? null,
    heartbeat: now,
    rawTimestamp: data.rawTimestamp ?? null,
    serverReceivedAt: now,
  }
  store.postCount++
  store.lastRealDataAt = now

  console.log(
    `[STORE] WRITE → temp=${store.latest.temp} hum=${store.latest.hum} ` +
    `fan=${store.latest.fan} humd=${store.latest.humidifier} ` +
    `posts=${store.postCount} errors=${store.errorCount} ` +
    `at=${now}`
  )

  return store.latest
}

export function writeDemoTelemetry(data: { temp: number; hum: number }): void {
  const store = getStore()
  store.demoData = { temp: data.temp, hum: data.hum, postedAt: new Date().toISOString() }
}

export function clearDemoTelemetry(): void {
  const store = getStore()
  store.demoData = null
}

export function recordTelemetryError(): void {
  const store = getStore()
  store.errorCount++
  console.log(`[STORE] ERROR — total errors=${store.errorCount}`)
}

export interface TelemetrySnapshot {
  temp: number
  hum: number
  fan: boolean | null
  humidifier: boolean | null
  heartbeat: string | null
  serverReceivedAt: string | null
  freshnessMs: number
  stale: boolean
  postCount: number
  errorCount: number
  storeCreatedAt: string
}

const STALE_MS = 15000

export function readTelemetry(): TelemetrySnapshot {
  const store = getStore()
  const { latest } = store

  let freshnessMs = 0
  if (latest.serverReceivedAt) {
    freshnessMs = Date.now() - new Date(latest.serverReceivedAt).getTime()
  }

  const stale = freshnessMs > STALE_MS && latest.serverReceivedAt !== null

  if (freshnessMs > 1000) {
    console.log(
      `[STORE] READ — temp=${latest.temp} hum=${latest.hum} ` +
      `freshness=${freshnessMs}ms stale=${stale} ` +
      `heartbeat=${latest.heartbeat ? "yes" : "no"} ` +
      `postCount=${store.postCount}`
    )
  }

  return {
    temp: latest.temp,
    hum: latest.hum,
    fan: latest.fan,
    humidifier: latest.humidifier,
    heartbeat: latest.heartbeat,
    serverReceivedAt: latest.serverReceivedAt,
    freshnessMs,
    stale,
    postCount: store.postCount,
    errorCount: store.errorCount,
    storeCreatedAt: store.createdAt,
  }
}

export function hasRealData(): boolean {
  const store = getStore()
  return store.latest.heartbeat !== null && (store.latest.temp > 0 || store.latest.hum > 0)
}

export function getTelemetrySource(): TelemetrySource {
  const store = getStore()
  if (store.lastRealDataAt) {
    const elapsed = Date.now() - new Date(store.lastRealDataAt).getTime()
    if (elapsed < SIMULATION_TIMEOUT_MS) return "live"
  }
  return "none"
}

export interface ActiveTelemetry {
  temp: number
  hum: number
  fan: boolean | null
  humidifier: boolean | null
  heartbeat: string | null
  serverReceivedAt: string | null
  freshnessMs: number
  stale: boolean
  postCount: number
  errorCount: number
  storeCreatedAt: string
  source: TelemetrySource
  simulated?: SimulatedTelemetry
}

export function getActiveTelemetry(): ActiveTelemetry {
  const source = getTelemetrySource()

  if (source === "live") {
    const snap = readTelemetry()
    return { ...snap, source }
  }

  const store = getStore()

  if (store.demoData) {
    const demoAge = Date.now() - new Date(store.demoData.postedAt).getTime()
    if (demoAge < SIMULATION_TIMEOUT_MS) {
      return {
        temp: store.demoData.temp,
        hum: store.demoData.hum,
        fan: null,
        humidifier: null,
        heartbeat: null,
        serverReceivedAt: store.demoData.postedAt,
        freshnessMs: demoAge,
        stale: demoAge > STALE_MS,
        postCount: store.postCount,
        errorCount: store.errorCount,
        storeCreatedAt: store.createdAt,
        source: "simulated",
      }
    }
  }

  const sim = generateSimulatedTelemetry()

  return {
    temp: sim.temp,
    hum: sim.hum,
    fan: sim.fan,
    humidifier: sim.humidifier,
    heartbeat: null,
    serverReceivedAt: new Date().toISOString(),
    freshnessMs: 0,
    stale: false,
    postCount: store.postCount,
    errorCount: store.errorCount,
    storeCreatedAt: store.createdAt,
    source: "simulated",
    simulated: sim,
  }
}

export function debugDump(): TelemetryStore {
  return getStore()
}
