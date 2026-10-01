import type { GrowSenseKey } from "@/lib/grow/presentation"
import type { MykoForm } from "@/lib/grow/types"
import { createPrng, NEUTRAL_MYKO_TRAITS, type MykoVisualTraits } from "./traits"
import { MYKO_GROUND_Y, mykoFormVisual, type MykoCrescentVisual, type MykoFormVisual } from "./visual-config"

/**
 * MYKO anatomy geometry. Pure and deterministic: (form, traits) → drawing.
 * Mood is NOT an input (posture is CSS), so the environment can never change
 * anatomy or identity.
 *
 * Everything is built in a CANONICAL orientation (the signature C opens to the
 * right) and mirrored on emission when the individual's traits face left.
 * All hyphae of one thickness share ONE <path>; every emitted number is
 * rounded to 0.1 so SSR and client serialise identically.
 */
export const MYKO_VIEWBOX = { minX: -110, minY: -110, width: 220, height: 220 } as const

export interface Point { x: number; y: number }
export interface Dot extends Point { r: number }
export interface MykoNode extends Dot {
  /** 0..1 distance from the nucleus — orders the sensing pulse outward. */
  order: number
}
export interface Spore extends Dot { dx: number; dy: number; delay: number; duration: number }

export interface MykoCapGeometry {
  role: "main"
  outer: string
  inner: string
  highlight: string
  /** All gills as one path. */
  gills: string
  /** Radial veins over an OPEN hood (membrane read, not a rigid plate); empty otherwise. */
  veins: string
  rim: Dot[]
  /** Bioluminescent spots on the upper surface, as one path. */
  spots: string
  pivot: Point
}

export interface MykoHyphaePaths {
  thick: string
  mid: string
  fine: string
  links: string
  widths: { thick: number; mid: number; fine: number; links: number }
}

export interface MykoNucleusGeometry {
  /** Slightly lobed body — never a perfect marble. */
  body: string
  /** Bright, offset inner yolk. */
  yolk: Dot
  /** Two tiny organelles, one path. */
  organelles: string
  /** Broken orbital ring around the nucleus. */
  orbit: string
}

/** The signature: nucleus suspended in an open C membrane, mouth facing `mouth`. */
export interface MykoSignature {
  membrane: string
  center: Point
  radius: number
  /** Mouth direction in degrees (emitted orientation). */
  mouth: number
}

export interface MykoSatellite {
  membrane: string
  core: Dot
  route: string
}

export interface MykoSenseAnchor {
  /** Point on the body the organ grows from. */
  from: Point
  /** The organ itself. */
  at: Point
}

export interface MykoGeometry {
  form: MykoForm
  seed: number
  /** 1 = mouth to the right, −1 = mirrored. */
  side: 1 | -1
  ground: number
  core: Dot
  nucleus: MykoNucleusGeometry
  signature: MykoSignature
  /** Sprout / spine shapes rising from the substrate. */
  bodies: string[]
  /** Luminous conduit nucleus → network. */
  vein: string
  /** Paths energy pulses travel along (vein → main hypha, colony routes). */
  routes: string[]
  caps: MykoCapGeometry[]
  satellites: MykoSatellite[]
  pins: Dot[]
  hyphae: MykoHyphaePaths
  tips: Dot[]
  nodes: MykoNode[]
  spores: Spore[]
  senseAnchors: Record<GrowSenseKey, MykoSenseAnchor>
  aura: { cx: number; cy: number; rx: number; ry: number }
  /** Transform origins (user space, emitted orientation). */
  pivots: { net: Point; body: Point; top: Point; core: Point }
}

// ── Emission (mirror + rounding) ──────────────────────────────────────
let S: 1 | -1 = 1
const r1 = (value: number) => Math.round(value * 10) / 10
const deg = (value: number) => (value * Math.PI) / 180
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const pt = (p: Point) => `${r1(S * p.x)} ${r1(p.y)}`
const rp = (p: Point): Point => ({ x: r1(S * p.x), y: r1(p.y) })
const rd = (p: Point, r: number): Dot => ({ ...rp(p), r: r1(r) })
const polar = (c: Point, r: number, angle: number): Point => ({ x: c.x + r * Math.cos(deg(angle)), y: c.y + r * Math.sin(deg(angle)) })

function dotsPath(dots: Dot[]): string {
  return dots
    .map((d) => `M${pt({ x: d.x - d.r, y: d.y })}a${r1(d.r)} ${r1(d.r)} 0 1 0 ${r1(2 * d.r * S)} 0a${r1(d.r)} ${r1(d.r)} 0 1 0 ${r1(-2 * d.r * S)} 0`)
    .join("")
}

/** Catmull-Rom → cubic through points (closed or open). */
function smooth(points: Point[], closed: boolean): string {
  const n = points.length
  const at = (i: number) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]
  let d = `M${pt(points[0])}`
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    d += `C${pt({ x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 })} ${pt({ x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 })} ${pt(p2)}`
  }
  return closed ? `${d}Z` : d
}

type Cubic = [Point, Point, Point, Point]

function cubicAt([p0, c1, c2, p1]: Cubic, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
  }
}

function split([p0, c1, c2, p1]: Cubic, t: number): [Cubic, Cubic] {
  const mix = (a: Point, b: Point) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })
  const a = mix(p0, c1), b = mix(c1, c2), c = mix(c2, p1)
  const d = mix(a, b), e = mix(b, c)
  const f = mix(d, e)
  return [[p0, a, d, f], [f, e, c, p1]]
}

const cubicPath = ([p0, c1, c2, p1]: Cubic, move = true) => `${move ? `M${pt(p0)}` : ""}C${pt(c1)} ${pt(c2)} ${pt(p1)}`

function hypha(from: Point, angle: number, length: number, bend: number, sink: number): Cubic {
  const dir = { x: Math.cos(angle), y: Math.sin(angle) }
  const perp = { x: -dir.y, y: dir.x }
  const end = { x: from.x + dir.x * length, y: from.y + dir.y * length + sink }
  const c1 = { x: from.x + dir.x * length * 0.33 + perp.x * bend, y: from.y + dir.y * length * 0.33 + perp.y * bend }
  const c2 = { x: from.x + dir.x * length * 0.68 - perp.x * bend * 0.6, y: from.y + dir.y * length * 0.68 - perp.y * bend * 0.6 + sink * 0.7 }
  return [from, c1, c2, end]
}

function blob(c: Point, radius: number, wobble: number, phase: number): string {
  const pts: Point[] = []
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 360
    const r = radius + wobble * Math.sin(deg(3 * a) + phase) + wobble * 0.5 * Math.sin(deg(5 * a) + phase * 2)
    pts.push(polar(c, r, a))
  }
  return smooth(pts, true)
}

/** The signature C: thick at the back, tapering to two tips, optional growing lip. */
function crescent(c: Point, v: MykoCrescentVisual, scale: number): string {
  const steps = 16
  const outer: Point[] = [], inner: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const a = lerp(v.start, v.end, u)
    const r = v.radius * scale * (1 + v.lip * u * u * u)
    const w = v.width * scale * (0.2 + 0.8 * Math.sin(Math.PI * Math.min(1, u * (v.lip > 0 ? 0.85 : 1))))
    outer.push(polar(c, r + w / 2, a))
    inner.push(polar(c, r - w / 2, a))
  }
  return smooth([...outer, ...inner.reverse()], true)
}

/** A fleshy spine from the substrate up to the body, tapering, with a foot bulb. */
function spine(base: Point, top: Point, wBase: number, wTop: number, bend: number): string {
  const hb = wBase / 2, ht = wTop / 2
  const midY = lerp(base.y, top.y, 0.5)
  return [
    `M${pt({ x: base.x - hb * 1.3, y: base.y + 2 })}`,
    `C${pt({ x: base.x - hb, y: base.y - 6 })} ${pt({ x: top.x - ht + bend, y: midY })} ${pt({ x: top.x - ht, y: top.y })}`,
    `L${pt({ x: top.x + ht, y: top.y })}`,
    `C${pt({ x: top.x + ht + bend, y: midY })} ${pt({ x: base.x + hb, y: base.y - 6 })} ${pt({ x: base.x + hb * 1.3, y: base.y + 2 })}`,
    `Q${pt({ x: base.x, y: base.y + 6 })} ${pt({ x: base.x - hb * 1.3, y: base.y + 2 })}Z`,
  ].join("")
}

/** Lateral hood (canonical: attached at `a`, extending to the right over the mouth). */
function hood(a: Point, w: number, h: number, shift: number, flare: number, lobes: number, gillCount: number, rimCount: number): MykoCapGeometry {
  const outline = (width: number, height: number, top: Point, fl: number, lobeCount: number) => {
    const cx = top.x + width * shift
    const xl = cx - width / 2, xr = cx + width / 2
    // fl > 0: the free edge turns up (opening); fl < 0: it droops over the mouth (sheltering).
    const edgeY = top.y + height * 0.16 - fl
    const leftY = top.y + height * 0.12
    const peak = { x: top.x + width * 0.14, y: top.y - height }
    let d = `M${pt({ x: xl, y: leftY })}`
    d += `C${pt({ x: xl + width * 0.02, y: top.y - height * 0.7 })} ${pt({ x: peak.x - width * 0.22, y: peak.y })} ${pt(peak)}`
    if (fl > 0 && lobeCount > 0) {
      // An OPEN hood is a living membrane, not a plate: its upper margin ripples as it unfolds.
      const ripples = 3
      for (let i = 1; i <= ripples; i++) {
        const t0 = (i - 1) / ripples, t1 = i / ripples
        const x0 = lerp(peak.x, xr, t0), x1 = lerp(peak.x, xr, t1)
        const y1 = i === ripples ? edgeY : lerp(peak.y, edgeY, t1 * t1) + (i % 2 === 0 ? -1 : 1) * height * 0.08
        const lift = i % 2 === 0 ? height * 0.14 : height * 0.3
        d += `Q${pt({ x: (x0 + x1) / 2, y: lerp(peak.y, edgeY, ((t0 + t1) / 2) ** 2) - lift })} ${pt({ x: x1, y: y1 })}`
      }
    } else {
      d += `C${pt({ x: peak.x + width * 0.32, y: peak.y - height * 0.04 })} ${pt({ x: xr - width * 0.03, y: top.y - height * 0.66 })} ${pt({ x: xr, y: edgeY })}`
    }
    const underY = (x: number) => {
      if (x < top.x) return lerp(top.y + height * 0.26, leftY, Math.min(1, (top.x - x) / Math.max(1, top.x - xl)))
      const t = Math.min(1, (x - top.x) / Math.max(1, xr - top.x))
      return lerp(top.y + height * 0.26, edgeY, t * t)
    }
    const segments = Math.max(2, lobeCount)
    for (let i = 1; i <= segments; i++) {
      const x0 = xr - (width * (i - 1)) / segments
      const x1 = xr - (width * i) / segments
      const xm = (x0 + x1) / 2
      // Opened margins split in two places (as a mature oyster cap does): an interrupted contour.
      const cleft = fl > 0 && lobeCount > 0 && (i === 2 || i === segments - 2)
      const lobe = cleft ? -height * 0.75 : lobeCount > 0 ? height * (i % 2 === 0 ? 0.05 : 0.18) : 0
      d += `Q${pt({ x: xm, y: underY(xm) + lobe })} ${pt({ x: x1, y: x1 <= xl + 0.01 ? leftY : underY(x1) })}`
    }
    return { d: `${d}Z`, xl, xr, underY }
  }

  const outer = outline(w, h, a, flare, lobes)
  const inner = outline(w * 0.72, h * 0.58, { x: a.x + w * 0.04, y: a.y - h * 0.1 }, flare * 0.6, 0)
  const hub = { x: a.x + w * 0.04, y: a.y + h * 0.08 }

  let gills = ""
  for (let i = 0; i < gillCount; i++) {
    const x = lerp(outer.xl + w * 0.08, outer.xr - w * 0.04, gillCount === 1 ? 0.5 : i / (gillCount - 1))
    gills += `M${pt(hub)}Q${pt({ x: lerp(hub.x, x, 0.55), y: hub.y + h * 0.08 })} ${pt({ x, y: outer.underY(x) - 0.6 })}`
  }
  let veins = ""
  if (flare > 0) {
    for (let i = 0; i < 5; i++) {
      const x = lerp(a.x + w * 0.12, outer.xr - w * 0.08, i / 4)
      const end = { x, y: lerp(a.y - h * 0.8, a.y - h * 0.2 - flare * 0.6, (i / 4) ** 1.4) }
      veins += `M${pt({ x: a.x + w * 0.06, y: a.y - h * 0.3 })}Q${pt({ x: lerp(a.x, x, 0.5), y: a.y - h * 0.62 })} ${pt(end)}`
    }
  }
  const rim = Array.from({ length: rimCount }, (_, i) => {
    const x = lerp(outer.xl + w * 0.1, outer.xr - w * 0.05, rimCount === 1 ? 0.5 : i / (rimCount - 1))
    return rd({ x, y: outer.underY(x) + 1.6 }, 1.1 + (i % 3) * 0.35)
  })
  const spots: Dot[] = Array.from({ length: 6 }, (_, i) => {
    const t = (i + 0.5) / 6
    const x = lerp(outer.xl + w * 0.18, outer.xr - w * 0.12, t)
    const lift = 1 - Math.pow(Math.abs(t - 0.45) * 2, 2)
    return { x, y: a.y - h * (0.28 + 0.46 * Math.max(0, lift)) + (i % 2) * h * 0.12, r: 1 + (i % 3) * 0.4 }
  })
  const cx = a.x + w * shift
  return {
    role: "main",
    outer: outer.d,
    inner: inner.d,
    highlight: `M${pt({ x: cx - w * 0.24, y: a.y - h * 0.62 })}Q${pt({ x: cx, y: a.y - h * 1.04 })} ${pt({ x: cx + w * 0.22, y: a.y - h * 0.8 })}`,
    gills,
    veins,
    rim,
    spots: dotsPath(spots),
    pivot: rp(a),
  }
}

const cache = new Map<string, MykoGeometry>()

export function buildMykoGeometry(form: MykoForm, traits: MykoVisualTraits = NEUTRAL_MYKO_TRAITS): MykoGeometry {
  const key = `${form}:${traits.seed}:${traits.lean}:${traits.curl}:${traits.reach}:${traits.bias}:${traits.capTurn}:${traits.extraBranches}:${traits.phase}`
  const cached = cache.get(key)
  if (cached) return cached
  S = traits.capTurn >= 0 ? 1 : -1
  try {
    const geometry = compute(form, mykoFormVisual(form), traits)
    cache.set(key, geometry)
    return geometry
  } finally {
    S = 1
  }
}

/** Canonical layout per form. Continuity: the nucleus rises and drifts toward the back as MYKO matures. */
function layout(v: MykoFormVisual, lean: number) {
  const G = MYKO_GROUND_Y
  switch (v.body) {
    case "pod": return { N: { x: -2 + lean * 4, y: 8 }, F: { x: -2, y: G + 1 } }
    case "sprout": return { N: { x: -6 + lean * 7, y: -6 }, F: { x: -14, y: G + 1 } }
    case "hooded": return { N: { x: -24 + lean * 8, y: -2 }, F: { x: -30, y: G + 1 } }
    case "colony": return { N: { x: -34 + lean * 8, y: -10 }, F: { x: -38, y: G + 1 } }
  }
}

function compute(form: MykoForm, v: MykoFormVisual, traits: MykoVisualTraits): MykoGeometry {
  const rand = createPrng((traits.seed ^ Math.imul(form.length + 7, 0x9e3779b1)) >>> 0)
  const signed = () => rand() * 2 - 1
  const G = MYKO_GROUND_Y
  const { N, F } = layout(v, traits.lean)
  const scale = 0.95 + (traits.curl - 0.75) * 0.18
  const cv = v.crescent
  const lean = traits.lean

  // ── Signature: nucleus in an open C ────────────────────────────────
  const core: Dot = { ...N, r: v.coreRadius }
  const membrane = crescent(N, cv, scale)
  const outerR = cv.radius * scale + (cv.width * scale) / 2
  const orbitStart = 196 + traits.phase * 40
  const orbitPts = Array.from({ length: 9 }, (_, i) => polar(N, core.r * 1.42, orbitStart + (i / 8) * 210))
  const nucleus: MykoNucleusGeometry = {
    body: blob(N, core.r, 0.75, 1 + traits.phase * 3),
    yolk: rd({ x: N.x - core.r * 0.24, y: N.y - core.r * 0.24 }, core.r * 0.46),
    organelles: dotsPath([
      { x: N.x + core.r * 0.42, y: N.y + core.r * 0.18, r: core.r * 0.12 },
      { x: N.x + core.r * 0.08, y: N.y + core.r * 0.5, r: core.r * 0.09 },
    ]),
    orbit: smooth(orbitPts, false),
  }

  // ── Body: sprout / spine joins the C to the substrate ──────────────
  const bodies: string[] = []
  if (v.body !== "pod") {
    const join = polar(N, outerR * 0.86, v.body === "sprout" ? 128 : 166)
    bodies.push(spine(F, join, v.body === "sprout" ? 18 : 24, v.body === "sprout" ? 12 : 15, lean * 6 + (v.body === "sprout" ? 4 : -6)))
  }

  // ── Hood: the C's upper end becomes a lateral canopy ───────────────
  const caps: MykoCapGeometry[] = []
  let top: Point = polar(N, outerR, cv.end)
  let hoodEdge: Point | null = null
  if (v.hood) {
    const capScale = 0.94 + (traits.reach - 0.9) * 0.6
    // The hood grows out of the C's upper end and cantilevers over the mouth.
    const tip = polar(N, cv.radius * scale, cv.end)
    const a = { x: tip.x, y: tip.y + v.hood.height * 0.12 }
    const shift = 0.3 + Math.abs(traits.capTurn) * 0.05
    const hw = v.hood.width * capScale, hh = v.hood.height * (2 - capScale)
    caps.push(hood(a, hw, hh, shift, v.hood.flare, v.hood.lobes, v.hood.gills, v.hood.rimLights))
    hoodEdge = { x: a.x + hw * shift + hw / 2 - 6, y: a.y + hh * 0.16 - v.hood.flare + 2 }
    top = { x: a.x + v.hood.width * 0.1, y: a.y - v.hood.height }
  }

  // ── Mycelial network (distributed body) ────────────────────────────
  const hv = v.hyphae
  const thick: string[] = [], mid: string[] = [], fine: string[] = [], links: string[] = []
  const tips: Dot[] = []
  const junctions: Point[] = []
  const primaries: Array<{ curve: Cubic; side: number }> = []

  hv.directions.forEach((baseAngle, i) => {
    const a = baseAngle + signed() * 8 * traits.curl
    const rad = deg(a)
    const down = Math.max(0, Math.sin(rad))
    const side = Math.cos(rad) >= 0 ? 1 : -1
    const verticalDamp = hv.origin === "foot" ? 1 - 0.8 * down : 1
    const length = lerp(hv.reach[0], hv.reach[1], rand()) * traits.reach * verticalDamp * (1 + 0.14 * traits.bias * side)
    const from = hv.origin === "pod"
      ? polar(N, outerR - 1, a)
      : { x: F.x + lerp(-hv.baseHalf, hv.baseHalf, (Math.cos(rad) + 1) / 2) + signed() * 3, y: G + 1 + rand() * 2 }
    const bend = (i % 2 === 0 ? 1 : -1) * (6 + rand() * 9) * traits.curl
    const curve = hypha(from, rad, length, bend, length * hv.sink)
    const [near, far] = split(curve, 0.45)
    thick.push(cubicPath(near))
    mid.push(cubicPath(far))
    primaries.push({ curve, side })
    if (tips.length < hv.tips) tips.push(rd(curve[3], 1.6 + rand() * 0.7))
  })

  const branchCount = Math.min(primaries.length, hv.branches + traits.extraBranches)
  const stride = primaries.length / Math.max(1, branchCount)
  for (let b = 0; b < branchCount; b++) {
    const { curve, side } = primaries[Math.floor((b * stride + traits.phase * stride) % primaries.length)]
    const t = 0.36 + rand() * 0.3
    const from = cubicAt(curve, t)
    const ahead = cubicAt(curve, Math.min(1, t + 0.05))
    const heading = Math.atan2(ahead.y - from.y, ahead.x - from.x)
    const turn = (b % 2 === 0 ? 1 : -1) * deg(26 + rand() * 20)
    const length = (20 + rand() * 18) * traits.reach
    fine.push(cubicPath(hypha(from, heading + turn, length, side * 4 * traits.curl, length * hv.sink)))
    junctions.push(from)
  }

  let made = 0
  for (let i = 0; i < primaries.length - 1 && made < hv.links; i++) {
    const a = primaries[i], b = primaries[i + 1]
    if (a.side !== b.side) continue
    const p = cubicAt(a.curve, 0.58 + rand() * 0.18)
    const q = cubicAt(b.curve, 0.5 + rand() * 0.2)
    links.push(`M${pt(p)}Q${pt({ x: (p.x + q.x) / 2 + signed() * 6, y: (p.y + q.y) / 2 + 4 + rand() * 4 })} ${pt(q)}`)
    junctions.push(p, q)
    made++
  }

  // ── Vein and energy routes: nucleus → vein → network ───────────────
  const veinEnd = hv.origin === "pod" ? primaries[1].curve[0] : { x: F.x + 4, y: G }
  const vein: Cubic = [
    { x: N.x + core.r * 0.2, y: N.y + core.r * 0.8 },
    { x: N.x + 4 + lean * 2, y: lerp(N.y, veinEnd.y, 0.45) },
    { x: veinEnd.x - 3, y: lerp(N.y, veinEnd.y, 0.75) },
    veinEnd,
  ]
  const mouthSide = primaries.filter((p) => p.side > 0)
  const mainHypha = [...mouthSide].sort((m, n) => Math.abs(m.curve[3].y - G) - Math.abs(n.curve[3].y - G))[0] ?? primaries[0]
  const routes = [`${cubicPath(vein)}L${pt(mainHypha.curve[0])}${cubicPath(mainHypha.curve, false)}`]

  // ── Colony: satellite pods, each a small nucleus-in-a-C ────────────
  const satellites: MykoSatellite[] = []
  const satSpots = [
    { x: 70 + rand() * 6, y: G - 9 },
    { x: -84 - rand() * 4, y: G - 7 },
  ].slice(0, v.satellites)
  for (const sat of satSpots) {
    const route: Cubic = [veinEnd, { x: lerp(veinEnd.x, sat.x, 0.35), y: G + 8 }, { x: lerp(veinEnd.x, sat.x, 0.75), y: G + 6 }, { x: sat.x - 2, y: sat.y + 7 }]
    satellites.push({
      membrane: crescent(sat, { radius: 8.5, width: 3.8, start: 12, end: 292, lip: 0 }, 1),
      core: rd(sat, 4.4),
      route: cubicPath(route),
    })
    routes.push(cubicPath(route))
  }

  const pins: Dot[] = []
  for (let i = 0; i < v.pins; i++) {
    const x = i === 0 ? -(46 + rand() * 8) : 48 + rand() * 10
    pins.push(rd({ x, y: G - 3 - rand() * 2 }, 2.8 + rand() * 0.8))
  }

  // Nodes: junctions first, then along primaries; ordered outward for the pulse.
  const candidates = [...junctions, ...primaries.map((p) => cubicAt(p.curve, 0.7))]
  const offset = Math.floor(traits.phase * candidates.length)
  const picked: Point[] = []
  for (let i = 0; i < candidates.length && picked.length < v.nodes; i++) picked.push(candidates[(i + offset) % candidates.length])
  const farthest = Math.max(1, ...picked.map((p) => Math.hypot(p.x - N.x, p.y - N.y)))
  const nodes: MykoNode[] = picked
    .map((p, i) => ({ ...rd(p, 1.7 + (i % 3) * 0.45), order: r1(Math.hypot(p.x - N.x, p.y - N.y) / farthest) }))
    .sort((m, n) => m.order - n.order)

  // ── Spores rise from the hood ──────────────────────────────────────
  const spores: Spore[] = Array.from({ length: v.spores }, (_, i) => {
    const spread = (v.hood?.width ?? 60) * 0.42
    const x = top.x + lerp(-spread * 0.6, spread, (i + 0.5) / v.spores) + signed() * 6
    return {
      ...rd({ x, y: top.y + 6 + rand() * 10 }, 0.9 + rand() * 0.9),
      dx: r1(S * (signed() * 16 + (x - top.x) * 0.15)),
      dy: r1(-24 - rand() * 18),
      delay: r1((i * 1.7 + traits.phase * 5) % 11),
      duration: r1(11 + rand() * 7),
    }
  })

  // ── Senses: organs grown from the body (stems, not badges) ─────────
  const wet = mouthSide[Math.min(1, mouthSide.length - 1)] ?? primaries[0]
  const anchor = (from: Point, at: Point): MykoSenseAnchor => ({ from: rp(from), at: rp(at) })
  // Never two organs flanking the nucleus at the same height (they would read as eyes).
  const senseAnchors: Record<GrowSenseKey, MykoSenseAnchor> = {
    temperature: anchor(polar(N, outerR - 2, 150), polar(N, outerR + 8, 146)),
    humidity: anchor(cubicAt(wet.curve, 0.42), cubicAt(wet.curve, 0.56)),
    // Vision looks out from the free edge of the hood (or the pod's upper lip).
    vision: hoodEdge
      ? anchor({ x: hoodEdge.x - 4, y: hoodEdge.y - 2 }, { x: hoodEdge.x + 2, y: hoodEdge.y + 6 })
      : anchor(polar(N, outerR - 2, cv.end - 4), polar(N, outerR + 8, cv.end - 2)),
    co2: v.hood
      ? anchor({ x: top.x - 4, y: top.y + 4 }, { x: top.x - 8, y: top.y - 5 })
      : anchor(polar(N, outerR - 1, 112), polar(N, outerR + 7, 108)),
    mass: anchor({ x: F.x, y: G }, { x: F.x, y: G + 9 }),
  }

  const topY = Math.min(top.y, N.y - outerR)
  const mouthCanonical = ((cv.start + cv.end) / 2 + 180) % 360
  return {
    form,
    seed: traits.seed,
    side: S,
    ground: G,
    core: rd(N, core.r),
    nucleus,
    signature: { membrane, center: rp(N), radius: r1(cv.radius * scale), mouth: S === 1 ? mouthCanonical : (540 - mouthCanonical) % 360 },
    bodies,
    vein: cubicPath(vein),
    routes,
    caps,
    satellites,
    pins,
    hyphae: {
      thick: thick.join(""),
      mid: mid.join(""),
      fine: fine.join(""),
      links: links.join(""),
      widths: { thick: hv.width, mid: r1(hv.width * 0.62), fine: r1(hv.width * 0.42), links: r1(hv.width * 0.34) },
    },
    tips,
    nodes,
    spores,
    senseAnchors,
    aura: { cx: r1(S * lerp(N.x, top.x, 0.5)), cy: r1((topY + G) / 2), rx: 106, ry: r1(Math.max(72, (G - topY) / 2 + 40)) },
    // The body folds around the nucleus so the C always stays concentric with it.
    pivots: { net: rp(F), body: rp(N), top: caps[0]?.pivot ?? rp(N), core: rp(N) },
  }
}
