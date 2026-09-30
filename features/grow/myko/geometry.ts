import type { MykoForm } from "@/lib/grow/types"

/**
 * MYKO visual grammar. Pure, deterministic geometry (no randomness) in a
 * -100..100 view box centred on the nucleus. Growth adds structure instead of
 * swapping illustrations: nucleus → hyphae → branches → knots → gill crown → opening.
 */
interface FormGrammar {
  nucleus: number
  membrane: number
  wobble: number
  hyphae: number
  hyphaLength: [number, number]
  branchesPerHypha: 0 | 1 | 2
  knots: number
  lamellae: number
  open: boolean
  spores: number
}

const GRAMMAR: Record<MykoForm, FormGrammar> = {
  early: { nucleus: 17, membrane: 25, wobble: 2.2, hyphae: 5, hyphaLength: [30, 40], branchesPerHypha: 0, knots: 0, lamellae: 0, open: false, spores: 3 },
  emerging: { nucleus: 20, membrane: 29, wobble: 2.6, hyphae: 7, hyphaLength: [40, 52], branchesPerHypha: 1, knots: 4, lamellae: 0, open: false, spores: 4 },
  mature: { nucleus: 23, membrane: 33, wobble: 3, hyphae: 9, hyphaLength: [50, 62], branchesPerHypha: 2, knots: 7, lamellae: 20, open: false, spores: 6 },
  complete: { nucleus: 23, membrane: 34, wobble: 2.4, hyphae: 9, hyphaLength: [56, 68], branchesPerHypha: 2, knots: 5, lamellae: 26, open: true, spores: 9 },
}

export interface Point { x: number; y: number }
export interface Hypha { d: string; tip: Point; width: number }
export interface Spore { x: number; y: number; r: number; dx: number; dy: number; delay: number; duration: number }

export interface MykoGeometry {
  nucleus: number
  membranePath: string
  hyphae: Hypha[]
  knots: Array<Point & { r: number }>
  lamellae: string[]
  spores: Spore[]
  organelles: Array<Point & { r: number }>
  open: boolean
}

const round = (value: number) => Math.round(value * 100) / 100
/** Deterministic pseudo-variation in [-1, 1]. */
const wave = (i: number, seed: number) => Math.sin(i * 12.9898 + seed * 78.233) * 0.5 + Math.sin(i * 3.7 + seed) * 0.5

function polar(radius: number, angle: number): Point {
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
}

function quadPoint(p0: Point, c: Point, p1: Point, t: number): Point {
  const u = 1 - t
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y }
}

function blobPath(radius: number, wobble: number, points = 10): string {
  const pts: Point[] = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    const r = radius + wobble * Math.sin(3 * a + 1.3) + wobble * 0.6 * Math.sin(5 * a + 0.4)
    pts.push(polar(r, a))
  }
  // Closed Catmull-Rom → cubic Bézier for an organic membrane.
  let d = `M${round(pts[0].x)} ${round(pts[0].y)}`
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % points]
    const p3 = pts[(i + 2) % points]
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(p2.x)} ${round(p2.y)}`
  }
  return `${d} Z`
}

function curve(from: Point, angle: number, length: number, bend: number): { d: string; p0: Point; c: Point; p1: Point } {
  const p1 = { x: from.x + length * Math.cos(angle), y: from.y + length * Math.sin(angle) }
  const mid = { x: (from.x + p1.x) / 2, y: (from.y + p1.y) / 2 }
  const c = { x: mid.x - Math.sin(angle) * bend, y: mid.y + Math.cos(angle) * bend }
  return { d: `M${round(from.x)} ${round(from.y)} Q${round(c.x)} ${round(c.y)} ${round(p1.x)} ${round(p1.y)}`, p0: from, c, p1 }
}

/**
 * @param tense Distressed MYKO draws straighter, shorter filaments (visual tension).
 */
export function buildMykoGeometry(form: MykoForm, tense = false): MykoGeometry {
  const g = GRAMMAR[form]
  const hyphae: Hypha[] = []
  const tips: Point[] = []
  const lengthScale = tense ? 0.86 : 1
  const bendScale = tense ? 0.25 : 1

  for (let i = 0; i < g.hyphae; i++) {
    const angle = (i / g.hyphae) * Math.PI * 2 - Math.PI / 2 + wave(i, 1) * 0.22
    const length = (g.hyphaLength[0] + (g.hyphaLength[1] - g.hyphaLength[0]) * (wave(i, 2) * 0.5 + 0.5)) * lengthScale
    const start = polar(g.membrane - 3, angle)
    const main = curve(start, angle, length, wave(i, 3) * 11 * bendScale)
    hyphae.push({ d: main.d, tip: main.p1, width: 1.5 })
    tips.push(main.p1)

    for (let b = 0; b < g.branchesPerHypha; b++) {
      const t = b === 0 ? 0.55 : 0.78
      const origin = quadPoint(main.p0, main.c, main.p1, t)
      const side = (b + i) % 2 === 0 ? 1 : -1
      const branch = curve(origin, angle + side * (0.55 + wave(i + b, 4) * 0.15), length * (b === 0 ? 0.42 : 0.28), side * 5 * bendScale)
      hyphae.push({ d: branch.d, tip: branch.p1, width: 1 })
      tips.push(branch.p1)
    }
  }

  const knots = tips
    .filter((_, index) => index % Math.max(1, Math.floor(tips.length / Math.max(g.knots, 1))) === 0)
    .slice(0, g.knots)
    .map((tip, index) => ({ ...tip, r: round(form === "emerging" ? 2.2 : 2.8 + (index % 3) * 0.6) }))

  const lamellae: string[] = []
  for (let i = 0; i < g.lamellae; i++) {
    const a = (i / g.lamellae) * Math.PI * 2
    const inner = polar(g.membrane + (g.open ? 1 : 2), a)
    const outer = polar(g.membrane + (g.open ? 22 + wave(i, 5) * 3 : 8 + wave(i, 5) * 1.5), a + (g.open ? 0.08 : 0))
    lamellae.push(`M${round(inner.x)} ${round(inner.y)} L${round(outer.x)} ${round(outer.y)}`)
  }

  const spores: Spore[] = []
  for (let i = 0; i < g.spores; i++) {
    const a = (i / g.spores) * Math.PI * 2 + 0.4 + wave(i, 6) * 0.3
    const start = polar(g.membrane + 14 + wave(i, 7) * 6, a)
    const travel = g.open ? 26 : 14
    spores.push({
      x: round(start.x),
      y: round(start.y),
      r: round(0.9 + (wave(i, 8) * 0.5 + 0.5) * 0.9),
      dx: round(Math.cos(a) * travel),
      dy: round(Math.sin(a) * travel - 6),
      delay: round((i * 1.7) % 9),
      duration: round(11 + (wave(i, 9) * 0.5 + 0.5) * 7),
    })
  }

  // Asymmetric intracellular bodies; sizes/positions avoid reading as a face.
  const organelles = [
    { x: round(-g.nucleus * 0.3), y: round(-g.nucleus * 0.22), r: round(g.nucleus * 0.26) },
    { x: round(g.nucleus * 0.38), y: round(g.nucleus * 0.3), r: round(g.nucleus * 0.1) },
  ]

  return {
    nucleus: g.nucleus,
    membranePath: blobPath(g.membrane, g.wobble),
    hyphae,
    knots,
    lamellae,
    spores,
    organelles,
    open: g.open,
  }
}
