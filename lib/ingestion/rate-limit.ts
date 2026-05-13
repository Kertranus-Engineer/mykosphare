const WINDOW_MS = 60_000
const DEFAULT_MAX_REQUESTS = 60

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL_MS = 120_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      store.delete(key)
    }
  }
}

function getMaxRequests(): number {
  const env = process.env.INGESTION_RATE_LIMIT
  if (env === undefined || env === null) return DEFAULT_MAX_REQUESTS
  const parsed = parseInt(env, 10)
  if (isNaN(parsed) || parsed < 0) return DEFAULT_MAX_REQUESTS
  return parsed
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(key: string): RateLimitResult {
  cleanup()

  const maxRequests = getMaxRequests()

  if (maxRequests === 0) {
    return { allowed: true, remaining: Infinity, resetAt: 0 }
  }

  const now = Date.now()
  let entry = store.get(key)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    entry = { count: 0, windowStart: now }
    store.set(key, entry)
  }

  entry.count++

  const windowElapsed = now - entry.windowStart
  const resetAt = entry.windowStart + WINDOW_MS
  const remaining = Math.max(0, maxRequests - entry.count)

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt }
  }

  return { allowed: true, remaining, resetAt }
}

export function getRateLimitStoreSize(): number {
  return store.size
}
