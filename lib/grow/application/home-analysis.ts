import {
  HISTORY_INTELLIGENCE_CONFIG, buildAssistantContext, deriveActivity, interpretEnvironment,
  type ActivityEvent, type AssistantContext, type CatalogEntry, type CultivationFacts, type EnvTargets, type IntelligenceReport,
} from "../intelligence"
import { stageLabel } from "../presentation/stage"
import type { HomeCultivation, HomeProfile, HomeReading, HomeResult } from "./home-read"

export type ReadyHome = Extract<HomeResult, { status: "ready" }>

export interface HomeAnalysis {
  report: IntelligenceReport
  events: ActivityEvent[]
  context: AssistantContext
  targets: EnvTargets | null
  facts: CultivationFacts | null
}

const GAP_MS = 15 * 60_000

export function targetsFromCultivation(cultivation: HomeCultivation | null | undefined): EnvTargets | null {
  if (!cultivation?.targets) return null
  return {
    ...cultivation.targets,
    label: `${cultivation.profile.displayName} · ${stageLabel(cultivation.stage)}`,
    validation: cultivation.profile.validation,
  }
}

export function factsFromCultivation(cultivation: HomeCultivation | null | undefined): CultivationFacts | null {
  if (!cultivation) return null
  return {
    name: cultivation.name, speciesName: cultivation.profile.displayName, scientificName: cultivation.profile.species,
    stage: cultivation.stage, stageLabel: stageLabel(cultivation.stage), startedAt: cultivation.startedAt,
    validation: cultivation.profile.validation, rangesSource: cultivation.rangesSource, targetsConfirmed: cultivation.targetsConfirmed,
  }
}

export function catalogFromProfiles(profiles: readonly HomeProfile[] | undefined): CatalogEntry[] {
  return (profiles ?? []).map(p => ({ name: p.displayName, scientificName: p.species, validation: p.validation, example: p.example ?? null }))
}

/**
 * One analysis used by BOTH the browser (HOME) and the server (assistant route), so what the person sees and what
 * any answerer is given can never disagree. Pure: real readings in, interpretation out.
 */
export function analyzeHome(result: ReadyHome, history: readonly HomeReading[] | null | undefined, now: number): HomeAnalysis {
  const cultivation = result.cultivation ?? null
  const targets = targetsFromCultivation(cultivation)
  const facts = factsFromCultivation(cultivation)
  const device = result.device
  const report = interpretEnvironment({
    readings: result.readings,
    device: device ? { name: device.name, enabled: device.enabled, lastSeenAt: device.lastSeenAt } : null,
    targets, now,
  })
  // 24 h context = stored 5-minute buckets + any raw readings newer than the last bucket.
  const buckets = history ?? []
  const lastBucket = buckets.length ? Date.parse(buckets[buckets.length - 1]?.observedAt ?? "") : 0
  const merged = [...buckets, ...result.readings.filter(r => Date.parse(r.observedAt) > lastBucket)]
  const events = deriveActivity(merged, targets, now, { config: HISTORY_INTELLIGENCE_CONFIG, gapMs: GAP_MS })
    .filter(event => event.endedAt !== null) // ongoing conditions come from the live report
  const context = buildAssistantContext({
    report, history: merged, events, now, deviceName: device?.name ?? null, cultivation: facts, catalog: catalogFromProfiles(result.profiles),
  })
  return { report, events, context, targets, facts }
}
