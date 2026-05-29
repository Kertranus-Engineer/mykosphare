/**
 * MYKOSPHARE — Server-Side Telemetry Store
 *
 * ÚNICA fuente de verdad para datos de telemetry.
 * Usa globalThis para sobrevivir HMR y cold-starts en Next.js App Router.
 *
 * SIN globalThis, `let latestData` en route.ts se resetea cada vez
 * que el módulo es reimportado (HMR en dev, nueva lambda en prod).
 */

export interface TelemetryRecord {
  temp: number
  hum: number
  fan: boolean | null
  humidifier: boolean | null
  /** ISO timestamp del último POST exitoso del ESP32 */
  heartbeat: string | null
  /** Timestamp enviado por el ESP32 (si lo manda) */
  rawTimestamp: string | null
  /** ISO timestamp del servidor cuando recibió el último POST */
  serverReceivedAt: string | null
}

export interface TelemetryStore {
  /** Último snapshot de telemetry recibido */
  latest: TelemetryRecord
  /** Cuenta de POSTs recibidos desde arranque */
  postCount: number
  /** Cuenta de errores en POST desde arranque */
  errorCount: number
  /** Timestamp de creación del store */
  createdAt: string
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
  }
}

// GlobalThis key — prefijo único para evitar colisiones
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

/** Escribe telemetry recibido del ESP32 en el store */
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

  console.log(
    `[STORE] WRITE → temp=${store.latest.temp} hum=${store.latest.hum} ` +
    `fan=${store.latest.fan} humd=${store.latest.humidifier} ` +
    `posts=${store.postCount} errors=${store.errorCount} ` +
    `at=${now}`
  )

  return store.latest
}

/** Registra un intento fallido de POST */
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

/** Lee el snapshot actual para GET /api/data */
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

/** Devuelve si el store tiene datos reales (ESP32 ha hecho POST) */
export function hasRealData(): boolean {
  const store = getStore()
  return store.latest.heartbeat !== null && (store.latest.temp > 0 || store.latest.hum > 0)
}

/** Para debug: vuelca todo el estado del store */
export function debugDump(): TelemetryStore {
  return getStore()
}
