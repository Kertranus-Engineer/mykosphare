import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, expectTypeOf, it } from "vitest"
import { presentSource } from "@/lib/grow/presentation"
import type { MykoViewModel } from "@/lib/grow/types"
import { SourceBadge } from "../components/source-badge"
import { buildMykoGeometry } from "../myko/geometry"
import { MykoRenderer, type MykoRendererProps } from "../myko/myko-renderer"

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
    expectTypeOf<keyof MykoRendererProps>().toEqualTypeOf<"model" | "decorative" | "className">()
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

  it("grows structurally and deterministically across forms", () => {
    const early = buildMykoGeometry("early")
    const emerging = buildMykoGeometry("emerging")
    const mature = buildMykoGeometry("mature")
    const complete = buildMykoGeometry("complete")
    expect(early.hyphae.length).toBeLessThan(emerging.hyphae.length)
    expect(emerging.hyphae.length).toBeLessThan(mature.hyphae.length)
    expect(mature.lamellae.length).toBeGreaterThan(0)
    expect(complete.open).toBe(true)
    expect(buildMykoGeometry("mature")).toEqual(mature)
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
