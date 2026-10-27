/** Persisted sensor view, independent of cultivation lifecycle. */
export interface HomeReading { observedAt: string; temperature: number | null; humidity: number | null }
export interface HomeDevice { id: string; name: string; enabled: boolean; lastSeenAt: string | null }
export interface HomeRange { min: number; max: number; criticalMin?: number; criticalMax?: number }
export interface HomeTargets { temperature?: HomeRange; humidity?: HomeRange }
export type HomeValidation = "sample" | "experimental" | "validated"
/** An available species profile the person can start a cultivation with. */
export interface HomeProfile { id: string; displayName: string; species: string; validation: HomeValidation; stages: string[] }
/** The chamber's active cultivation, with the targets of its CONFIRMED stage (null when the profile lacks them). */
export interface HomeCultivation {
  runId: string; name: string; startedAt: string; stage: string
  profile: { id: string; displayName: string; species: string; validation: HomeValidation; stages: string[] }
  targets: HomeTargets | null
}

export interface HomeRepository {
  findOwnedChamber(ownerId: string, chamberId?: string): Promise<{ id: string; name: string } | null>
  findDevice(chamberId: string): Promise<HomeDevice | null>
  readings(chamberId: string, deviceId: string): Promise<HomeReading[]>
  /** Last 24 h as 5-minute averages, oldest first. Optional: absent in minimal repositories. */
  history?(chamberId: string, deviceId: string, sinceIso: string): Promise<HomeReading[]>
  activeCultivation?(chamberId: string): Promise<HomeCultivation | null>
  profiles?(): Promise<HomeProfile[]>
}
export type HomeResult =
  | { status: "unauthorized" | "unconfigured" | "not_found" | "unavailable" }
  | {
      status: "ready"; chamber: { id: string; name: string }; device: HomeDevice | null; readings: HomeReading[]
      /** Present only when requested. */
      history?: HomeReading[]
      /** null = no active cultivation. Absent = not provided by this repository. */
      cultivation?: HomeCultivation | null
      profiles?: HomeProfile[]
    }

export async function getHomeReadings(
  repository: HomeRepository, ownerId: string | null, chamberId?: string, options: { includeHistory?: boolean; now?: Date } = {},
): Promise<HomeResult> {
  if (!ownerId) return { status: "unauthorized" }
  try {
    const chamber = await repository.findOwnedChamber(ownerId, chamberId)
    if (!chamber) return { status: chamberId ? "not_found" : "unconfigured" }
    const device = await repository.findDevice(chamber.id)
    const readings = device ? await repository.readings(chamber.id, device.id) : []
    const result: Extract<HomeResult, { status: "ready" }> = { status: "ready", chamber, device, readings }
    // Context for the intelligence layer degrades independently: it must never hide the real readings.
    if (options.includeHistory && device && repository.history) {
      const since = new Date((options.now ?? new Date()).getTime() - 24 * 3_600_000).toISOString()
      try { result.history = await repository.history(chamber.id, device.id, since) } catch { /* readings stay valid */ }
    }
    if (repository.activeCultivation) {
      try {
        result.cultivation = await repository.activeCultivation(chamber.id)
        if (result.cultivation === null && repository.profiles) result.profiles = await repository.profiles()
      } catch { delete result.cultivation }
    }
    return result
  } catch { return { status: "unavailable" } }
}
