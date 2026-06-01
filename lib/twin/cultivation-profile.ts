export interface CultivationProfile {
  id: string
  name: string
  species: string
  strain?: string
  inoculationDate: string
  expectedHarvestDate?: string
  notes?: string
}

const STORAGE_KEY = "mykosphare-cultivation-profiles"
const ACTIVE_PROFILE_KEY = "mykosphare-active-profile"

let idCounter = Date.now()

function nextProfileId(): string {
  return `prf-${(idCounter++).toString(36)}`
}

export function createCultivationProfile(
  name: string,
  species: string,
  inoculationDate: string,
  strain?: string,
  expectedHarvestDate?: string,
  notes?: string,
): CultivationProfile {
  return {
    id: nextProfileId(),
    name,
    species,
    strain,
    inoculationDate,
    expectedHarvestDate,
    notes,
  }
}

export function daysSinceInoculation(profile: CultivationProfile): number {
  const inoculation = new Date(profile.inoculationDate).getTime()
  const now = Date.now()
  if (isNaN(inoculation) || inoculation > now) return 0
  return Math.floor((now - inoculation) / (1000 * 60 * 60 * 24))
}

export function daysUntilHarvest(profile: CultivationProfile): number | null {
  if (!profile.expectedHarvestDate) return null
  const harvest = new Date(profile.expectedHarvestDate).getTime()
  const now = Date.now()
  if (isNaN(harvest)) return null
  return Math.ceil((harvest - now) / (1000 * 60 * 60 * 24))
}

export function saveProfiles(profiles: CultivationProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
  } catch {
    // storage full or unavailable
  }
}

export function loadProfiles(): CultivationProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as CultivationProfile[]
  } catch {
    return []
  }
}

export function saveActiveProfileId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_PROFILE_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_PROFILE_KEY)
    }
  } catch {
    // storage unavailable
  }
}

export function loadActiveProfileId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY)
  } catch {
    return null
  }
}

export interface TwinHealthScore {
  overall: number
  telemetryAvailability: number
  captureAvailability: number
  correlationQuality: number
  validationQuality: number
}

export function computeTwinHealthScore(input: {
  hasTelemetry: boolean
  hasCaptures: boolean
  totalCaptures: number
  expectedCaptures: number
  correlationScore: number
  confirmedValidations: number
  rejectedValidations: number
}): TwinHealthScore {
  const telemetryAvailability = input.hasTelemetry ? 100 : 0

  const captureAvailability = input.expectedCaptures > 0
    ? Math.round(Math.min(input.totalCaptures / input.expectedCaptures, 1) * 100)
    : input.hasCaptures ? 80 : 0

  const correlationQuality = input.correlationScore

  const totalValidations = input.confirmedValidations + input.rejectedValidations
  const validationQuality = totalValidations > 0
    ? Math.round((input.confirmedValidations / totalValidations) * 100)
    : 50

  const overall = Math.round(
    telemetryAvailability * 0.25 +
    captureAvailability * 0.25 +
    correlationQuality * 0.25 +
    validationQuality * 0.25,
  )

  return {
    overall,
    telemetryAvailability,
    captureAvailability,
    correlationQuality,
    validationQuality,
  }
}
