import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, expectTypeOf, it } from "vitest"
import { presentBodySenses } from "@/lib/grow/presentation"
import { buildGrowSnapshot } from "@/lib/grow/snapshot"
import { createSampleOysterRun, SAMPLE_PLEUROTUS_OSTREATUS_PROFILE } from "@/lib/grow/fixtures"
import { createSampleSimulationReading } from "@/lib/grow/simulation"
import type { MykoForm, MykoViewModel } from "@/lib/grow/types"
import { nextForm, planEvolution, previousForm } from "../lab/evolution"
import { LAB_ALL_SENSES, LAB_INDIVIDUALS } from "../lab/visual-fixtures"
import { buildMykoGeometry } from "../myko/geometry"
import { mykoPresence } from "../myko/presence"
import { MykoRenderer } from "../myko/myko-renderer"
import { deriveMykoTraits, hashIdentity, NEUTRAL_MYKO_TRAITS } from "../myko/traits"

const FORMS: MykoForm[] = ["early", "emerging", "mature", "complete"]
const model = (form: MykoForm, mood: MykoViewModel["mood"] = "content"): MykoViewModel =>
  ({ form, mood, activity: "idle", attention: "none", messageKey: "test", origin: "simulated" })

describe("MYKO traits — individuality from a stable seed", () => {
  it("same seed → same traits and same geometry (reload, server, client)", () => {
    expect(deriveMykoTraits("run-123")).toEqual(deriveMykoTraits("run-123"))
    expect(hashIdentity("run-123")).toBe(hashIdentity("run-123"))
    const a = renderToStaticMarkup(<MykoRenderer model={model("mature")} traits={deriveMykoTraits("run-123")} still />)
    const b = renderToStaticMarkup(<MykoRenderer model={model("mature")} traits={deriveMykoTraits("run-123")} still />)
    expect(a).toBe(b)
  })

  it("different seeds → controlled, bounded variation", () => {
    const all = LAB_INDIVIDUALS.map((individual) => deriveMykoTraits(individual.identity))
    expect(new Set(all.map((t) => t.seed)).size).toBe(all.length)
    for (const traits of all) {
      expect(Math.abs(traits.lean)).toBeLessThanOrEqual(1)
      expect(Math.abs(traits.bias)).toBeLessThanOrEqual(1)
      expect(Math.abs(traits.capTurn)).toBeLessThanOrEqual(1)
      expect(traits.curl).toBeGreaterThanOrEqual(0.75)
      expect(traits.curl).toBeLessThanOrEqual(1.3)
      expect(traits.reach).toBeGreaterThanOrEqual(0.9)
      expect(traits.reach).toBeLessThanOrEqual(1.1)
      expect([0, 1, 2]).toContain(traits.extraBranches)
    }
    const drawings = new Set(all.map((traits) => buildMykoGeometry("mature", traits).hyphae.thick))
    expect(drawings.size).toBe(all.length)
  })

  it("traits never depend on mood: derivation only takes the identity string", () => {
    expectTypeOf<Parameters<typeof deriveMykoTraits>>().toEqualTypeOf<[identity: string | null | undefined]>()
    const traits = deriveMykoTraits("run-xyz")
    const content = buildMykoGeometry("mature", traits)
    // Mood is not a geometry input at all; the same individual draws the same body.
    expect(buildMykoGeometry("mature", deriveMykoTraits("run-xyz"))).toEqual(content)
  })

  it("traits never alter the stage: every individual keeps its form's anatomy", () => {
    for (const individual of LAB_INDIVIDUALS) {
      const traits = deriveMykoTraits(individual.identity)
      for (const form of FORMS) {
        const g = buildMykoGeometry(form, traits)
        const neutral = buildMykoGeometry(form, NEUTRAL_MYKO_TRAITS)
        expect(g.form).toBe(form)
        expect(g.caps.length).toBe(neutral.caps.length)
        expect(g.satellites.length).toBe(neutral.satellites.length)
        expect(g.bodies.length).toBe(neutral.bodies.length)
        expect(g.pins.length).toBe(neutral.pins.length)
        expect(g.spores.length).toBe(neutral.spores.length)
        expect(g.nodes.length).toBe(neutral.nodes.length)
      }
    }
  })

  it("forms stay structurally distinct for every individual", () => {
    for (const individual of LAB_INDIVIDUALS) {
      const traits = deriveMykoTraits(individual.identity)
      const signature = FORMS.map((form) => {
        const g = buildMykoGeometry(form, traits)
        return `${g.caps.length}|${g.satellites.length}|${g.pins.length}|${g.bodies.length}`
      })
      expect(new Set(signature).size).toBe(FORMS.length)
    }
  })

  it("the SIGNATURE (nucleus suspended in an open C, joined by a vein) exists in every form, for every individual", () => {
    for (const individual of LAB_INDIVIDUALS) {
      const traits = deriveMykoTraits(individual.identity)
      const forms = FORMS.map((form) => buildMykoGeometry(form, traits))
      for (const g of forms) {
        expect(g.signature.membrane).toMatch(/^M.*Z$/)
        expect(g.signature.center).toEqual({ x: g.core.x, y: g.core.y })
        // The C is wider than the nucleus: a visible hollow (survives as a silhouette).
        expect(g.signature.radius).toBeGreaterThan(g.core.r + 4)
        expect(g.vein).toMatch(/^M/)
      }
      // Continuity: the same individual always faces the same side.
      expect(new Set(forms.map((g) => g.side)).size).toBe(1)
      const html = renderToStaticMarkup(<MykoRenderer model={model("complete")} traits={traits} />)
      expect(html).toContain("myko-signature")
    }
  })

  it("only the OPEN hood (Plenitud) carries membrane veins; Madurez stays a closed sheltering hood", () => {
    expect(buildMykoGeometry("complete").caps[0].veins).toMatch(/^M/)
    expect(buildMykoGeometry("mature").caps[0].veins).toBe("")
  })

  it("the colony's satellites echo the signature (each is a small nucleus in a C)", () => {
    const g = buildMykoGeometry("complete", deriveMykoTraits("run-colony"))
    for (const sat of g.satellites) {
      expect(sat.membrane).toMatch(/^M.*Z$/)
      expect(sat.core.r).toBeLessThan(g.core.r)
      expect(sat.route).toMatch(/^M/)
    }
  })

  it("emits only rounded coordinates (SSR and client serialise identically)", () => {
    const g = buildMykoGeometry("complete", deriveMykoTraits("run-rounding"))
    const numbers = [g.hyphae.thick, g.hyphae.mid, g.hyphae.fine, g.hyphae.links, ...g.bodies, g.vein, g.signature.membrane, g.nucleus.body, ...g.routes, ...g.caps.flatMap((c) => [c.outer, c.gills])]
      .join(" ")
      .match(/-?\d+\.\d+/g) ?? []
    expect(numbers.length).toBeGreaterThan(50)
    expect(numbers.every((n) => (n.split(".")[1] ?? "").length <= 1)).toBe(true)
  })

  it("the product derives identity from the cultivation run id", () => {
    const run = createSampleOysterRun()
    const snapshot = buildGrowSnapshot({ run, profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, reading: createSampleSimulationReading({ scenario: "stable", now: new Date() }), now: new Date() })
    expect(mykoPresence(snapshot).identity).toBe(run.id)
  })
})

describe("no Math.random in MYKO rendering", () => {
  const roots = [path.resolve(__dirname, "../myko"), path.resolve(__dirname, "../lab")]
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(entry)) files.push(full)
    }
  }
  roots.forEach(walk)

  it("scans the renderer and lab", () => {
    expect(files.length).toBeGreaterThan(6)
  })

  it("never uses Math.random", () => {
    expect(files.filter((file) => /Math\.random\s*\(/.test(readFileSync(file, "utf8")))).toEqual([])
  })
})

describe("senses on the body", () => {
  const snapshot = (reading: boolean) => {
    const now = new Date()
    return buildGrowSnapshot({
      run: createSampleOysterRun(),
      profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE,
      reading: reading ? createSampleSimulationReading({ scenario: "stable", now }) : null,
      now,
    })
  }

  it("only installed capabilities appear; absent sensors never do", () => {
    const senses = presentBodySenses(snapshot(true))
    expect(senses.map((s) => s.key)).toEqual(["temperature", "humidity"])
    expect(senses.every((s) => s.state === "active")).toBe(true)
    const html = renderToStaticMarkup(<MykoRenderer model={model("mature")} senses={senses} />)
    expect(html).toContain('data-sense="temperature"')
    expect(html).toContain('data-sense="humidity"')
    for (const absent of ["co2", "vision", "mass"]) expect(html).not.toContain(`data-sense="${absent}"`)
  })

  it("a need is localised on the organ that perceives it (from the domain tone)", () => {
    const now = new Date()
    const dry = buildGrowSnapshot({ run: createSampleOysterRun(), profile: SAMPLE_PLEUROTUS_OSTREATUS_PROFILE, reading: createSampleSimulationReading({ scenario: "dry", now }), now })
    const senses = presentBodySenses(dry)
    expect(senses.find((s) => s.key === "humidity")?.alert).toBe("attention")
    expect(senses.find((s) => s.key === "temperature")?.alert).toBeNull()
    const html = renderToStaticMarkup(<MykoRenderer model={model("mature", "concerned")} senses={senses} />)
    expect(html).toContain('data-alert="attention"')
  })

  it("installed senses without an observation are quiet, never lit", () => {
    const senses = presentBodySenses(snapshot(false))
    expect(senses.map((s) => s.key)).toEqual(["temperature", "humidity"])
    expect(senses.every((s) => s.state === "quiet")).toBe(true)
  })

  it("the full sense system exists only as a Lab fixture", () => {
    expect(LAB_ALL_SENSES.map((s) => s.key)).toEqual(["temperature", "humidity", "vision", "co2", "mass"])
  })
})

describe("evolution ceremony preview (Lab only)", () => {
  it("is a pure plan over forms that cannot touch a CultivationRun", () => {
    const run = Object.freeze(createSampleOysterRun())
    const before = JSON.stringify(run)
    const plan = planEvolution("early")
    expect(plan).toMatchObject({ from: "early", to: "emerging" })
    expect(plan?.steps.map((s) => s.phase)).toEqual(["charge", "emerge"])
    expect(plan?.totalMs).toBeGreaterThanOrEqual(1500)
    expect(plan?.totalMs).toBeLessThanOrEqual(3000)
    expect(JSON.stringify(run)).toBe(before)
    expectTypeOf<Parameters<typeof planEvolution>>().toEqualTypeOf<[from: MykoForm]>()
  })

  it("has no evolution beyond the final form and steps both ways", () => {
    expect(planEvolution("complete")).toBeNull()
    expect(nextForm("mature")).toBe("complete")
    expect(previousForm("early")).toBeNull()
  })

  it("renders its phases as renderer attributes only", () => {
    const html = renderToStaticMarkup(<MykoRenderer model={model("emerging")} moment="emerge" />)
    expect(html).toContain('data-moment="emerge"')
    expect(html).toContain("myko-ring")
  })
})

describe("offline is waiting, not illness", () => {
  it("uncertain renders a waiting MYKO with all of its anatomy", () => {
    const html = renderToStaticMarkup(<MykoRenderer model={model("mature", "uncertain")} activity="sensing" />)
    expect(html).toContain('data-live="waiting"')
    expect(html).toContain('data-posture="waiting"')
    expect(html).toContain("myko-signature")
    expect(html).toContain("myko-cap")
  })
})

describe("reduced motion contract", () => {
  const css = readFileSync(path.resolve(__dirname, "../styles/grow.css"), "utf8")

  it("every infinite MYKO animation lives inside prefers-reduced-motion: no-preference", () => {
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"))
    const inside = block.slice(0, block.indexOf("\n}\n") + 2)
    const outside = css.replace(inside, "")
    expect(inside).toContain("infinite")
    expect(outside.match(/\.myko[^{]*\{[^}]*animation:[^}]*infinite/g) ?? []).toEqual([])
  })
})
