import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, expectTypeOf, it } from "vitest"
import { presentSource } from "@/lib/grow/presentation"
import type { MykoViewModel } from "@/lib/grow/types"
import { SourceBadge } from "../components/source-badge"
import { buildMykoGeometry } from "../myko/geometry"
import { MykoRenderer, type MykoRendererProps } from "../myko/myko-renderer"
import type { MykoVisualTraits } from "../myko/traits"

const model: MykoViewModel = { form: "emerging", mood: "concerned", activity: "idle", attention: "notice", messageKey: "myko.status.humidity_low", origin: "simulated" }

describe("SourceBadge", () => {
  it("simulation never renders the REAL badge", () => {
    for (const origin of ["real", "simulated", null] as const) {
      const html = renderToStaticMarkup(<SourceBadge source={presentSource("simulation", origin)} />)
      expect(html).toContain('data-source="simulated"')
      expect(html).toContain("Simulación")
      expect(html).not.toContain('data-source="real"')
      expect(html).not.toMatch(/>Real</)
    }
  })

  it("real renders REAL with its own mark", () => {
    const html = renderToStaticMarkup(<SourceBadge source={presentSource("real", "real")} />)
    expect(html).toContain('data-source="real"')
    expect(html).toContain("g-source-mark-real")
  })
})

describe("MYKO renderer contract", () => {
  it("receives only the MykoViewModel (no telemetry props)", () => {
    expectTypeOf<MykoRendererProps["model"]>().toEqualTypeOf<MykoViewModel>()
    // Only presentation inputs besides the view model — no telemetry, no GrowState.
    expectTypeOf<keyof MykoRendererProps>().toEqualTypeOf<"model" | "traits" | "activity" | "senses" | "decorative" | "className" | "reaction" | "moment" | "still">()
  })

  it("renders form and mood as semantics with an accessible label", () => {
    const html = renderToStaticMarkup(<MykoRenderer model={model} />)
    expect(html).toContain('data-form="emerging"')
    expect(html).toContain('data-mood="concerned"')
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="MYKO, forma emergente, inquieto"')
  })

  it("decorative MYKO is hidden from assistive tech", () => {
    const html = renderToStaticMarkup(<MykoRenderer model={model} decorative />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('role="img"')
  })

  it("grows structurally (not by scaling) and deterministically across forms", () => {
    const early = buildMykoGeometry("early")
    const emerging = buildMykoGeometry("emerging")
    const mature = buildMykoGeometry("mature")
    const complete = buildMykoGeometry("complete")
    // ESPORA → NÚCLEO → ORGANISMO → COLONIA: pod → sprout + pins → hooded → hooded colony.
    expect(early.bodies).toHaveLength(0)
    expect(early.caps).toHaveLength(0)
    expect(emerging.bodies).toHaveLength(1)
    expect(emerging.pins.length).toBeGreaterThan(0)
    expect(emerging.caps).toHaveLength(0)
    expect(mature.caps).toHaveLength(1)
    expect(mature.caps[0].gills).not.toBe("")
    expect(mature.satellites).toHaveLength(0)
    expect(complete.caps).toHaveLength(1)
    expect(complete.satellites.length).toBeGreaterThan(0)
    expect(complete.spores.length).toBeGreaterThan(mature.spores.length)
    expect(complete.nodes.length).toBeGreaterThan(mature.nodes.length)
    expect(mature.nodes.length).toBeGreaterThan(early.nodes.length)
    expect(buildMykoGeometry("mature")).toBe(mature)
  })

  it("the mycelial network is a few shared paths, born from a region (not one point)", () => {
    const g = buildMykoGeometry("mature")
    const starts = [...g.hyphae.thick.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]))
    expect(new Set(starts).size).toBeGreaterThan(5)
    expect(Math.max(...starts) - Math.min(...starts)).toBeGreaterThan(15)
    expect(g.hyphae.links).not.toBe("")
    const html = renderToStaticMarkup(<MykoRenderer model={{ ...model, form: "mature" }} />)
    expect(html.match(/class="myko-h /g)).toHaveLength(4)
  })

  it("mood is not a geometry input: posture is presentation (CSS) only", () => {
    expectTypeOf<Parameters<typeof buildMykoGeometry>>().toEqualTypeOf<[form: MykoViewModel["form"], traits?: MykoVisualTraits]>()
    const content = renderToStaticMarkup(<MykoRenderer model={{ ...model, form: "mature", mood: "content" }} />)
    const distressed = renderToStaticMarkup(<MykoRenderer model={{ ...model, form: "mature", mood: "distressed" }} />)
    const paths = (html: string) => [...html.matchAll(/ d="([^"]+)"/g)].map((m) => m[1])
    expect(paths(distressed)).toEqual(paths(content))
    expect(distressed).toContain('data-posture="defensive"')
  })

  it("renders identity layers in every mood and hides spores when distressed or uncertain", () => {
    for (const mood of ["content", "concerned", "distressed", "uncertain"] as const) {
      const html = renderToStaticMarkup(<MykoRenderer model={{ ...model, form: "mature", mood }} />)
      expect(html).toContain("myko-cap")
      expect(html).toContain("myko-core")
      expect(html).toContain("myko-h-thick")
      expect(html.includes("myko-spores")).toBe(mood === "content" || mood === "concerned")
    }
  })

  it("the tap reaction and still mode are cosmetic attributes only", () => {
    const html = renderToStaticMarkup(<MykoRenderer model={model} reaction={2} still />)
    expect(html).toContain("myko-burst")
    expect(html).toContain('data-still="true"')
    expect(html).toContain('data-form="emerging"')
  })
})

/** Thresholds belong to the domain/profile. Grower UI and presentation must never compare metrics. */
describe("no duplicated domain thresholds in Grower UI", () => {
  const roots = [path.resolve(__dirname, ".."), path.resolve(__dirname, "../../../lib/grow/presentation")]
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry)
      if (statSync(full).isDirectory()) { if (entry !== "__tests__") walk(full) }
      else if (/\.(ts|tsx)$/.test(entry)) files.push(full)
    }
  }
  roots.forEach(walk)

  it("scans the expected files", () => {
    expect(files.length).toBeGreaterThan(15)
  })

  it.each([
    /\b(temperature|humidity|temp|hum)\b[^\n;]{0,24}[<>]=?\s*-?\d/,
    /\.value\s*[<>]=?/,
    /\b(min|max|criticalMin|criticalMax)\s*[<>]=?/,
  ])("no metric comparison matching %s", (pattern) => {
    const offenders = files.filter((file) => pattern.test(readFileSync(file, "utf8")))
    expect(offenders).toEqual([])
  })
})
