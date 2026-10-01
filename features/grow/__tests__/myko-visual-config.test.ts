import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { MYKO_FORM_VISUALS, MYKO_MOOD_VISUALS, mykoFormVisual, mykoMoodVisual } from "../myko/visual-config"
import { LAB_FORMS, LAB_MOODS, visualFixture } from "../lab/visual-fixtures"

describe("MYKO form → anatomy config", () => {
  it("each form is a different anatomy around the same signature C", () => {
    expect(mykoFormVisual("early")).toMatchObject({ body: "pod", hood: null, satellites: 0, pins: 0 })
    expect(mykoFormVisual("emerging")).toMatchObject({ body: "sprout", hood: null, satellites: 0 })
    expect(mykoFormVisual("emerging").pins).toBeGreaterThan(0)
    expect(mykoFormVisual("emerging").crescent.lip).toBeGreaterThan(0)
    expect(mykoFormVisual("mature")).toMatchObject({ body: "hooded", satellites: 0 })
    expect(mykoFormVisual("complete")).toMatchObject({ body: "colony" })
    expect(mykoFormVisual("complete").satellites).toBeGreaterThan(0)
    for (const form of LAB_FORMS) {
      const crescent = mykoFormVisual(form).crescent
      // An OPEN C: never a closed ring.
      expect(crescent.end - crescent.start).toBeGreaterThan(180)
      expect(crescent.end - crescent.start).toBeLessThan(330)
    }
  })

  it("Madurez shelters (hood droops) and Plenitud opens (hood flares up)", () => {
    expect(mykoFormVisual("mature").hood!.flare).toBeLessThan(0)
    expect(mykoFormVisual("complete").hood!.flare).toBeGreaterThan(0)
  })

  it("the spore explores from its pod; later forms spread a mat from a foot region", () => {
    expect(MYKO_FORM_VISUALS.early.hyphae.origin).toBe("pod")
    for (const form of ["emerging", "mature", "complete"] as const) {
      expect(MYKO_FORM_VISUALS[form].hyphae.origin).toBe("foot")
      expect(MYKO_FORM_VISUALS[form].hyphae.baseHalf).toBeGreaterThan(0)
    }
  })

  it("presence grows with development", () => {
    const order = ["early", "emerging", "mature", "complete"] as const
    for (let i = 1; i < order.length; i++) {
      const previous = MYKO_FORM_VISUALS[order[i - 1]]
      const current = MYKO_FORM_VISUALS[order[i]]
      expect(current.hyphae.directions.length).toBeGreaterThanOrEqual(previous.hyphae.directions.length)
      expect(current.hyphae.links).toBeGreaterThanOrEqual(previous.hyphae.links)
      expect(current.nodes).toBeGreaterThan(previous.nodes)
    }
  })
})

describe("MYKO mood → visual behaviour", () => {
  it("maps each mood to posture, halo, rhythm and light", () => {
    expect(mykoMoodVisual("content")).toMatchObject({ posture: "open", halo: "none", rhythm: "calm", spores: true, light: 1 })
    expect(mykoMoodVisual("concerned")).toMatchObject({ posture: "gathered", halo: "attention", rhythm: "uneven" })
    expect(mykoMoodVisual("distressed")).toMatchObject({ posture: "defensive", halo: "critical", spores: false })
    expect(mykoMoodVisual("uncertain")).toMatchObject({ posture: "waiting", spores: false })
  })

  it("waiting is dimmer than content; faster breathing signals distress", () => {
    expect(MYKO_MOOD_VISUALS.uncertain.light).toBeLessThan(MYKO_MOOD_VISUALS.content.light)
    expect(MYKO_MOOD_VISUALS.distressed.breath).toBeLessThan(MYKO_MOOD_VISUALS.concerned.breath)
    expect(MYKO_MOOD_VISUALS.concerned.breath).toBeLessThan(MYKO_MOOD_VISUALS.content.breath)
  })

  it("offline is not illness: the uncertain palette keeps MYKO's identity colours", () => {
    const css = readFileSync(path.resolve(__dirname, "../styles/grow.css"), "utf8")
    const start = css.indexOf('.myko[data-mood="uncertain"] {')
    const block = css.slice(start, css.indexOf("}", start))
    expect(start).toBeGreaterThan(-1)
    // Membrane / hood (identity) are never recoloured, and nothing is turned grey.
    expect(block).not.toMatch(/--myko-(membrane|hood|hypha)/)
    expect(block).not.toMatch(/grayscale|saturate\(0/)
  })
})

describe("visual lab fixtures", () => {
  it("cover the full 4×4 grid and are marked as fixtures, not data", () => {
    const fixtures = LAB_FORMS.flatMap((form) => LAB_MOODS.map((mood) => visualFixture(form, mood)))
    expect(fixtures).toHaveLength(16)
    expect(fixtures.every((fixture) => fixture.messageKey === "lab.visual-fixture" && fixture.origin === null)).toBe(true)
  })
})
