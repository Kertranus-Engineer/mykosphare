import type { SpeciesProfile } from "../../types"

/**
 * TEST FIXTURE — NOT A VALIDATED CULTIVATION PROFILE.
 *
 * A synthetic, generic flowering plant used ONLY to prove the platform is not
 * mushroom-locked. Its numbers are placeholders, not agronomy. It is never
 * shipped in production data, seeded, or shown in any UI.
 */
export const TEST_FIXTURE_FLOWERING_PLANT: SpeciesProfile = {
  id: "test-fixture-flowering-plant",
  commonName: "TEST FIXTURE flowering plant",
  scientificName: "Testus floralis (fixture)",
  kind: "sample",
  organismKind: "flowering_plant",
  morphology: "flowering_plant",
  capabilities: ["temperature", "humidity", "light", "substrate_moisture"],
  stages: [
    { id: "germination", label: "Germination", mykoForm: "early", suggestFromDay: 0 },
    { id: "vegetative", label: "Vegetative", mykoForm: "emerging", suggestFromDay: 10 },
    { id: "flowering", label: "Flowering", mykoForm: "mature", suggestFromDay: 40 },
    { id: "fruiting", label: "Fruiting", mykoForm: "complete", suggestFromDay: 60 },
  ],
  stageTargets: {
    germination: { temperature: { min: 20, max: 26 }, humidity: { min: 60, max: 80 } },
    vegetative: { temperature: { min: 20, max: 28 }, humidity: { min: 50, max: 70 }, metrics: { light: { min: 10_000, max: 40_000 } } },
    flowering: { temperature: { min: 18, max: 26 }, humidity: { min: 45, max: 65 } },
    fruiting: { temperature: { min: 18, max: 26 }, humidity: { min: 45, max: 65 } },
  },
}
