import { normalizeText } from "./intent"

/**
 * Text understanding for the guided cultivation setup. It only MATCHES what the person says against profiles and stages
 * that exist; it never creates a species, never guesses a stage, and returns null when unsure so MYKO asks again.
 */
export interface SetupProfile { id: string; displayName: string; species: string; stages: string[] }

const SPECIES_ALIASES: Record<string, string[]> = {
  "pleurotus ostreatus": ["ostra", "pleurotus", "ostreatus", "orellana", "oyster", "gírgola", "girgola"],
}

export function matchSpecies(text: string, profiles: readonly SetupProfile[]): SetupProfile | null {
  const t = normalizeText(text)
  if (!t) return null
  const hits = profiles.filter(p => {
    const own = normalizeText(`${p.displayName} ${p.species}`).split(" ").filter(w => w.length >= 5 && !["sample", "mushroom"].includes(w))
    const aliases = (SPECIES_ALIASES[p.species.toLowerCase()] ?? []).map(normalizeText)
    return [...own, ...aliases].some(word => word && new RegExp(`(^|\\s)${word}`).test(t))
  })
  return hits.length === 1 ? (hits[0] ?? null) : null
}

const STAGE_WORDS: Record<string, string[]> = {
  inoculation: ["inocul", "sembr", "semill"],
  colonization: ["coloniz", "micelio", "invadi", "blanque"],
  consolidation: ["consolid", "maduran", "madur"],
  primordia: ["primordi", "alfiler", "brotes", "pins"],
  fruiting: ["fructific", "fructif", "fruct", "hongos crecien"],
  harvest: ["cosech", "recolect"],
}
const NOT_YET = /\b(todavia no|aun no|no he|sin inocular|preparando|preparar|armando|pensando|despues|mas adelante)\b/

export type StageMatch = { kind: "stage"; stage: string } | { kind: "not_yet" } | null

export function matchStage(text: string, available: readonly string[]): StageMatch {
  const t = normalizeText(text)
  if (!t) return null
  if (NOT_YET.test(t)) return { kind: "not_yet" }
  const found = Object.entries(STAGE_WORDS).filter(([stage, words]) => available.includes(stage) && words.some(w => t.includes(w))).map(([stage]) => stage)
  // "inoculé ayer y ya está colonizando": the most advanced stage mentioned is where the crop is now.
  const order = ["inoculation", "colonization", "consolidation", "primordia", "fruiting", "harvest"]
  const latest = found.sort((a, b) => order.indexOf(a) - order.indexOf(b)).at(-1)
  return latest ? { kind: "stage", stage: latest } : null
}
