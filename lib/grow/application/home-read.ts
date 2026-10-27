/** Persisted sensor view, independent of cultivation lifecycle. */
export interface HomeReading { observedAt: string; temperature: number | null; humidity: number | null }
export interface HomeDevice { id: string; name: string; enabled: boolean; lastSeenAt: string | null }
export interface HomeRepository {
  findOwnedChamber(ownerId: string, chamberId?: string): Promise<{ id: string; name: string } | null>
  findDevice(chamberId: string): Promise<HomeDevice | null>
  readings(chamberId: string, deviceId: string): Promise<HomeReading[]>
}
export type HomeResult =
  | { status: "unauthorized" | "unconfigured" | "not_found" | "unavailable" }
  | { status: "ready"; chamber: { id: string; name: string }; device: HomeDevice | null; readings: HomeReading[] }

export async function getHomeReadings(repository: HomeRepository, ownerId: string | null, chamberId?: string): Promise<HomeResult> {
  if (!ownerId) return { status: "unauthorized" }
  try {
    const chamber = await repository.findOwnedChamber(ownerId, chamberId)
    if (!chamber) return { status: chamberId ? "not_found" : "unconfigured" }
    const device = await repository.findDevice(chamber.id)
    const readings = device ? await repository.readings(chamber.id, device.id) : []
    return { status: "ready", chamber, device, readings }
  } catch { return { status: "unavailable" } }
}
