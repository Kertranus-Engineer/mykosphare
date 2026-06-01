export type CaptureSource = "manual" | "esp32cam" | "smartphone" | "api"

export type AnalysisStatus = "pending" | "processing" | "completed" | "failed"

export type GrowthStage = "inoculation" | "colonization" | "consolidation" | "primordia" | "fruiting" | "harvest"

export interface VisualCapture {
  id: string
  imageUrl: string
  timestamp: string
  source: CaptureSource
  analysisStatus: AnalysisStatus

  sensors: {
    temperature: number
    humidity: number
    co2: number
  }

  ai: {
    status: string
    confidence: number
    observation: string
  }

  growth: {
    stage: GrowthStage
    progress: number
  }

  sessionId?: string
}

export interface CaptureSession {
  id: string
  name: string
  createdAt: string
  captures: string[]
}

export interface SnapshotStorage {
  saveCapture(capture: VisualCapture): Promise<void>
  getCaptures(): Promise<VisualCapture[]>
  getCapture(id: string): Promise<VisualCapture | null>
  deleteCapture(id: string): Promise<void>
  getSessions(): Promise<CaptureSession[]>
  getSession(id: string): Promise<CaptureSession | null>
  createSession(name: string): Promise<CaptureSession>
}

const REGISTRY_PATH = "/data/visual-registry.json"
const SESSIONS_PATH = "/data/visual-sessions.json"

let registryCache: VisualCapture[] | null = null
let sessionsCache: CaptureSession[] | null = null

async function fetchRegistry(): Promise<VisualCapture[]> {
  if (registryCache) return registryCache
  try {
    const res = await fetch(REGISTRY_PATH)
    if (!res.ok) return []
    registryCache = await res.json()
    return registryCache ?? []
  } catch {
    return []
  }
}

async function fetchSessions(): Promise<CaptureSession[]> {
  if (sessionsCache) return sessionsCache
  try {
    const res = await fetch(SESSIONS_PATH)
    if (!res.ok) return []
    sessionsCache = await res.json()
    return sessionsCache ?? []
  } catch {
    return []
  }
}

export const LocalStorage: SnapshotStorage = {
  async saveCapture(capture: VisualCapture): Promise<void> {
    const registry = await fetchRegistry()
    const idx = registry.findIndex((c) => c.id === capture.id)
    if (idx >= 0) {
      registry[idx] = capture
    } else {
      registry.push(capture)
    }
    registryCache = registry
  },

  async getCaptures(): Promise<VisualCapture[]> {
    return fetchRegistry()
  },

  async getCapture(id: string): Promise<VisualCapture | null> {
    const registry = await fetchRegistry()
    return registry.find((c) => c.id === id) ?? null
  },

  async deleteCapture(id: string): Promise<void> {
    const registry = await fetchRegistry()
    registryCache = registry.filter((c) => c.id !== id)
  },

  async getSessions(): Promise<CaptureSession[]> {
    return fetchSessions()
  },

  async getSession(id: string): Promise<CaptureSession | null> {
    const sessions = await fetchSessions()
    return sessions.find((s) => s.id === id) ?? null
  },

  async createSession(name: string): Promise<CaptureSession> {
    const sessions = await fetchSessions()
    const session: CaptureSession = {
      id: `session-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      captures: [],
    }
    sessions.push(session)
    sessionsCache = sessions
    return session
  },
}
