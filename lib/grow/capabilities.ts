import type { CapabilityKey, DeviceFreshness, EnvironmentalReading, MetricCapabilityKey, SpeciesProfile } from "./types"

/**
 * Capability vocabulary. Four DIFFERENT questions, never collapsed:
 *
 *   supported  — the organism profile benefits from this observation;
 *   installed  — hardware for it is installed on the chamber;
 *   available  — installed AND its device is currently reporting (fresh);
 *   observed   — the latest reading actually carries a value for it.
 *
 * A capability that is not observed has value `null` — never 0. Adding a
 * sensor later = installing it on a device + feeding real readings; no
 * column for every imaginable sensor is created ahead of time.
 */
export interface CapabilityDefinition {
  key: CapabilityKey
  kind: "metric" | "image"
  unit: string | null
}

export const CAPABILITY_REGISTRY: Readonly<Record<CapabilityKey, CapabilityDefinition>> = {
  temperature: { key: "temperature", kind: "metric", unit: "°C" },
  humidity: { key: "humidity", kind: "metric", unit: "%" },
  co2: { key: "co2", kind: "metric", unit: "ppm" },
  light: { key: "light", kind: "metric", unit: "lux" },
  substrate_moisture: { key: "substrate_moisture", kind: "metric", unit: "%" },
  ph: { key: "ph", kind: "metric", unit: "pH" },
  ec: { key: "ec", kind: "metric", unit: "mS/cm" },
  mass: { key: "mass", kind: "metric", unit: "g" },
  vision: { key: "vision", kind: "image", unit: null },
}

export const CAPABILITY_KEYS = Object.keys(CAPABILITY_REGISTRY) as CapabilityKey[]

export function isCapabilityKey(value: unknown): value is CapabilityKey {
  return typeof value === "string" && value in CAPABILITY_REGISTRY
}

/** What the fungal default profile benefits from when it does not declare capabilities. */
export const FUNGAL_DEFAULT_CAPABILITIES: readonly CapabilityKey[] = ["temperature", "humidity", "co2", "vision", "mass"]

/** Readings carry only the metrics the platform can persist today. */
const READING_METRICS: Partial<Record<MetricCapabilityKey, (reading: EnvironmentalReading) => number | undefined>> = {
  temperature: (reading) => reading.temperature,
  humidity: (reading) => reading.humidity,
}

export interface CapabilityStatus {
  key: CapabilityKey
  supported: boolean
  installed: boolean
  available: boolean
  observed: boolean
  /** Only when observed. Unavailable/unobserved is null, NEVER 0. */
  value: number | null
  unit: string | null
}

export function resolveCapabilities(input: {
  profile: Pick<SpeciesProfile, "capabilities"> | null
  installed: readonly CapabilityKey[]
  reading: EnvironmentalReading | null
  freshness: DeviceFreshness
  /** Vision is available only when a recent capture exists (camera reporting). */
  captureFresh?: boolean
}): CapabilityStatus[] {
  const supported = new Set(input.profile?.capabilities ?? FUNGAL_DEFAULT_CAPABILITIES)
  const installed = new Set(input.installed)
  const relevant = CAPABILITY_KEYS.filter((key) => supported.has(key) || installed.has(key))
  return relevant.map((key) => {
    const definition = CAPABILITY_REGISTRY[key]
    const isInstalled = installed.has(key)
    const available = isInstalled && (definition.kind === "image" ? input.captureFresh === true : input.freshness === "live")
    const raw = definition.kind === "metric" && input.reading ? READING_METRICS[key as MetricCapabilityKey]?.(input.reading) : undefined
    const value = available && raw !== undefined && Number.isFinite(raw) ? raw : null
    return {
      key,
      supported: supported.has(key),
      installed: isInstalled,
      available,
      observed: value !== null,
      value,
      unit: definition.unit,
    }
  })
}

/** Installed capabilities of a chamber = union over its devices (validated vocabulary only). */
export function chamberInstalledCapabilities(devices: ReadonlyArray<{ capabilities: readonly string[]; enabled?: boolean }>): CapabilityKey[] {
  const set = new Set<CapabilityKey>()
  for (const device of devices) {
    if (device.enabled === false) continue
    for (const capability of device.capabilities) if (isCapabilityKey(capability)) set.add(capability)
  }
  return CAPABILITY_KEYS.filter((key) => set.has(key))
}
