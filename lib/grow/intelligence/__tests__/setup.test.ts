import { describe, expect, it } from "vitest"
import { matchSpecies, matchStage } from "../index"

const profiles = [{ id: "p1", displayName: "Sample oyster mushroom", species: "Pleurotus ostreatus", stages: ["inoculation", "colonization", "consolidation", "primordia", "fruiting", "harvest"] }]
const stages = profiles[0]!.stages

describe("guided setup: species", () => {
  it.each(["hongos ostra", "Pleurotus", "quiero cultivar orellana", "ostras", "oyster mushroom"])("%s matches the oyster profile", (text) => {
    expect(matchSpecies(text, profiles)?.id).toBe("p1")
  })
  it.each(["shiitake", "tomates", "", "quiero cultivar algo"])("%s matches nothing, so MYKO never invents a profile", (text) => {
    expect(matchSpecies(text, profiles)).toBeNull()
  })
})

describe("guided setup: stage", () => {
  it.each([
    ["Ya está colonizando", "colonization"],
    ["inoculé ayer", "inoculation"],
    ["ya hay primordios", "primordia"],
    ["están fructificando", "fruiting"],
    ["estoy cosechando", "harvest"],
    ["inoculé hace una semana y ya está colonizando", "colonization"],
  ])("%s → %s", (text, stage) => expect(matchStage(text, stages)).toEqual({ kind: "stage", stage }))

  it.each(["todavía estoy preparando el sustrato", "aún no he inoculado", "más adelante"])("%s is not a stage yet", (text) => {
    expect(matchStage(text, stages)).toEqual({ kind: "not_yet" })
  })

  it("returns null when unsure instead of assuming a stage, and ignores stages the profile does not have", () => {
    expect(matchStage("no sé", stages)).toBeNull()
    expect(matchStage("colonizando", ["inoculation", "harvest"])).toBeNull()
  })
})
