import type { ProcessedCapture } from "./types"

const STORAGE_KEY = "mykosphare_hash_registry"

interface HashEntry {
  hash: string
  captureId: string
  filename: string
  registeredAt: string
}

function loadRegistry(): Map<string, HashEntry> {
  if (typeof window === "undefined") return new Map()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    const entries: HashEntry[] = JSON.parse(raw)
    const map = new Map<string, HashEntry>()
    for (const entry of entries) {
      map.set(entry.hash, entry)
    }
    return map
  } catch {
    return new Map()
  }
}

function saveRegistry(registry: Map<string, HashEntry>): void {
  try {
    const entries = Array.from(registry.values())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch { /* quota exceeded or unavailable */ }
}

export function checkDuplicate(
  capture: ProcessedCapture,
  existingHashes: Map<string, HashEntry>,
): { isDuplicate: boolean; duplicateOfId?: string } {
  const entry = existingHashes.get(capture.hash)
  if (entry && entry.captureId !== capture.id) {
    return { isDuplicate: true, duplicateOfId: entry.captureId }
  }
  return { isDuplicate: false }
}

export function registerCapture(
  capture: ProcessedCapture,
  registry: Map<string, HashEntry>,
): Map<string, HashEntry> {
  registry.set(capture.hash, {
    hash: capture.hash,
    captureId: capture.id,
    filename: capture.filename,
    registeredAt: new Date().toISOString(),
  })
  saveRegistry(registry)
  return registry
}

export function detectDuplicates(
  captures: ProcessedCapture[],
): ProcessedCapture[] {
  const registry = loadRegistry()
  const unique: ProcessedCapture[] = []

  for (const capture of captures) {
    const { isDuplicate, duplicateOfId } = checkDuplicate(capture, registry)
    if (isDuplicate) {
      unique.push({ ...capture, isDuplicate: true, duplicateOfId, lifecycle: "processed" })
    } else {
      unique.push(capture)
      registerCapture(capture, registry)
    }
  }

  return unique
}

export function getHashRegistry(): Map<string, HashEntry> {
  return loadRegistry()
}

export function clearHashRegistry(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

export function computeStringHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, "0")
}
