import type { CultivationRun, SpeciesProfile } from "./types"

/** SAMPLE/DEMO ONLY. These values are not validated cultivation guidance. */
const SAMPLE_TARGETS = {
  temperature: { min: 20, max: 24, criticalMin: 16, criticalMax: 28 },
  humidity: { min: 60, max: 75, criticalMin: 45, criticalMax: 90 },
}

export const SAMPLE_PLEUROTUS_OSTREATUS_PROFILE: SpeciesProfile = {
  id: "sample-pleurotus-ostreatus-v1",
  commonName: "Sample oyster mushroom",
  scientificName: "Pleurotus ostreatus",
  kind: "sample",
  stageTargets: {
    inoculation: SAMPLE_TARGETS,
    colonization: SAMPLE_TARGETS,
    consolidation: SAMPLE_TARGETS,
    primordia: SAMPLE_TARGETS,
    fruiting: SAMPLE_TARGETS,
    harvest: SAMPLE_TARGETS,
  },
}

export function createSampleOysterRun(): CultivationRun {
  return {
    id: "sample-oyster-run-001",
    speciesProfileId: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE.id,
    startedAt: "2026-09-20T12:00:00.000Z",
    confirmedStage: "colonization",
    stageConfirmedAt: "2026-09-23T12:00:00.000Z",
  }
}
