/**
 * Specimens for the glyph field (the character-art background): fungi and plants drawn in white
 * ink on a transparent canvas whose pixels are character cells. Coverage becomes glyph brightness.
 *
 * Every specimen is a function of its life `t` (0 → 1, looping): spores, mycelium and pinheads for
 * fungi; seed, roots, sprout, leaves and bloom for plants. Specimens start at different points of
 * their cycle, so any moment shows every phase at once. Everything is deterministic (no Math.random
 * while drawing) so a shape only ever changes because it is growing.
 *
 * Units are CSS pixels, origin at the specimen's base, y grows downward (stems go to negative y).
 */

type Ctx = CanvasRenderingContext2D

export const FUNGI = ["oyster", "button", "amanita", "morel", "chanterelle", "puffball", "coral", "shiitake", "lionsmane", "inkcap", "mycelium", "spores"] as const
export const PLANTS = ["seedling", "fern", "grass", "flower", "tree", "succulent"] as const
export type SpecimenKind = (typeof FUNGI)[number] | (typeof PLANTS)[number]

/** Fungi and plants interleaved, so stepping through the list by a stride alternates between them. */
const KINDS: readonly SpecimenKind[] = [
  "oyster", "seedling", "amanita", "fern", "morel", "flower", "chanterelle", "grass", "puffball",
  "tree", "coral", "succulent", "shiitake", "mycelium", "lionsmane", "spores", "button", "inkcap",
]
/** Coprime with KINDS.length, so consecutive lives of one specimen visit every kind before repeating. */
const KIND_STRIDE = 5

export interface Specimen {
  kind: SpecimenKind
  /** Base position on screen (px). */
  x: number
  y: number
  /** Nominal height (px). The kind is the one it starts with; each new life shows the next kind. */
  size: number
  /** Seconds for one full life. */
  period: number
  /** Where in its life it starts (0–1). */
  offset: number
  seed: number
}

const TAU = Math.PI * 2
const W1 = 5.5 // main outline, about one cell wide
const W2 = 3.6
const W3 = 2.2

const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)
const sm = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a))
  return x * x * (3 - 2 * x)
}
/** Deterministic pseudo-random in [0,1) from (seed, id). */
const hr = (seed: number, id: number) => {
  const x = Math.sin(seed * 12.9898 + id * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Layout ──────────────────────────────────────────────────────────────────

/** The app column on wide screens (34rem); specimens crowd the gutters either side of it. */
const COLUMN = 560

/**
 * Specimens spread over the viewport (a jittered grid; the side gutters on wide screens), with every
 * kind and phase mixed. Pure and deterministic for a given size.
 */
export function layoutSpecimens(width: number, height: number): Specimen[] {
  const scale = clamp(Math.min(width, height) / 520, 0.8, 1.4)
  const average = 205 * scale
  const rand = mulberry32(1337 + Math.round(width / 40) * 7)

  const slots: { x: number; y: number; room: number }[] = []
  if (width >= 760) {
    const band = Math.max((width - COLUMN) / 2, average * 0.6)
    const rows = Math.max(2, Math.round(height / (average * 0.72)))
    const cellH = height / rows
    for (let row = 0; row < rows; row++) {
      for (const side of [0, 1]) {
        const inset = band * (0.3 + rand() * 0.4)
        const y = (row + 0.62 + rand() * 0.3) * cellH + (side ? cellH * 0.45 : 0)
        slots.push({ x: side ? width - inset : inset, y: y > height * 1.02 ? y - height : y, room: cellH })
      }
    }
  } else {
    const count = Math.round(clamp((width * height) / (average * average * 1.5), 8, 28))
    const rows = Math.max(2, Math.round(Math.sqrt(count / (width / height))))
    const cols = Math.max(2, Math.ceil(count / rows))
    const cellW = width / cols
    const cellH = height / rows
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        slots.push({
          x: (col + 0.18 + rand() * 0.64) * cellW + (row % 2 ? cellW * 0.12 : 0),
          y: (row + 0.62 + rand() * 0.34) * cellH,
          room: cellH,
        })
      }
    }
  }

  const kinds: SpecimenKind[] = [...FUNGI, ...PLANTS]
  const bag: SpecimenKind[] = []
  const refill = () => {
    const next = [...kinds]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    bag.push(...next)
  }

  return slots.map(({ x, y, room }) => {
    if (bag.length === 0) refill()
    return {
      kind: bag.pop() as SpecimenKind,
      x,
      y,
      size: Math.min(average * (0.78 + rand() * 0.5), room * 1.25),
      period: 55 + rand() * 50,
      // Most start mid-growth so the first screen is full of recognisable plants and fungi; the rest are spores or mycelium.
      offset: rand() < 0.7 ? 0.38 + rand() * 0.55 : rand() * 0.38,
      seed: Math.floor(rand() * 9000) + 1,
    }
  })
}

// ── Drawing primitives ─────────────────────────────────────────────────────

let env = 1 // overall fade of the specimen being drawn

function al(g: Ctx, a: number) {
  g.globalAlpha = clamp(a * env)
}

function fillStroke(g: Ctx, fill: number, stroke: number, width = W1) {
  al(g, fill)
  g.fill()
  al(g, stroke)
  g.lineWidth = width
  g.stroke()
}

function line(g: Ctx, x1: number, y1: number, x2: number, y2: number, width: number, a: number) {
  al(g, a)
  g.lineWidth = width
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.stroke()
}

function dot(g: Ctx, x: number, y: number, r: number, a: number) {
  al(g, a)
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fill()
}

/** Cuts a hole in what has been drawn (spots, pits, openings). */
function cut(g: Ctx, a: number, draw: () => void) {
  g.globalCompositeOperation = "destination-out"
  al(g, a)
  draw()
  g.globalCompositeOperation = "source-over"
}

function ground(g: Ctx, width: number, a = 0.34) {
  for (let x = -width; x <= width; x += 10) dot(g, x, 0, 1.7, a)
}

/** Branching network that grows level by level: roots, hyphae. `p` is 0–1 progress. */
function network(g: Ctx, seed: number, p: number, x: number, y: number, angles: number[], length: number, depth: number, spread: number, width: number, tips = true) {
  if (p <= 0) return
  const branch = (bx: number, by: number, ang: number, len: number, d: number, w: number, id: number) => {
    const reveal = clamp(p * (depth + 1) - d)
    if (reveal <= 0) return
    const ex = bx + Math.cos(ang) * len * reveal
    const ey = by + Math.sin(ang) * len * reveal
    line(g, bx, by, ex, ey, Math.max(W3 * 0.7, w), 0.85 - d * 0.08)
    if (reveal < 1) return
    if (d >= depth) {
      if (tips) dot(g, ex, ey, 2.2, 0.8)
      return
    }
    const kids = d === 0 ? 3 : 2
    for (let i = 0; i < kids; i++) {
      const kid = id * 4 + i + 1
      const turn = (kids === 2 ? (i === 0 ? -1 : 1) : i - 1) * (0.45 + hr(seed, kid) * spread)
      branch(ex, ey, ang + turn, len * (0.66 + hr(seed, kid + 99) * 0.2), d + 1, w * 0.72, kid)
    }
  }
  angles.forEach((a, i) => branch(x, y, a, length, 0, width, i + 1))
}

function spores(g: Ctx, seed: number, span: number, a: number, lift = 0) {
  if (a <= 0.01) return
  for (let i = 0; i < 20; i++) {
    const px = (hr(seed, i) - 0.5) * span
    const py = -hr(seed, i + 40) * span * 0.34 + lift * (0.4 + hr(seed, i + 80))
    dot(g, px, py, 1.8 + hr(seed, i + 120) * 1.4, a * (0.55 + hr(seed, i + 160) * 0.45))
  }
}

/** Spores falling from under a cap. */
function sporeRain(g: Ctx, seed: number, amount: number, cx: number, cy: number, rx: number, drop: number, time: number) {
  if (amount <= 0.02) return
  for (let i = 0; i < 16; i++) {
    const phase = (time * 0.35 + hr(seed, i + 7)) % 1
    const px = cx + (hr(seed, i) - 0.5) * rx * 1.7 + Math.sin(phase * 5 + i) * 4
    dot(g, px, cy + phase * drop, 1.9, amount * (1 - phase) * 0.95)
  }
}

function stipe(g: Ctx, h: number, wb: number, wt: number) {
  if (h < 2) return
  g.beginPath()
  g.moveTo(-wb, 0)
  g.quadraticCurveTo(-(wb + wt) * 0.46, -h * 0.5, -wt, -h)
  g.lineTo(wt, -h)
  g.quadraticCurveTo((wb + wt) * 0.46, -h * 0.5, wb, 0)
  g.closePath()
  fillStroke(g, 0.42, 0.9, W2)
}

/** Dome cap with gills underneath. `open` flattens it as it matures. */
function cap(g: Ctx, cx: number, cy: number, rx: number, ry: number, open: number, gills = true) {
  if (rx < 2) return
  const lip = ry * 0.3 * (1 - open * 0.5)
  g.beginPath()
  g.ellipse(cx, cy, rx, ry, 0, Math.PI, TAU)
  g.quadraticCurveTo(cx, cy + lip * 2, cx - rx, cy)
  g.closePath()
  fillStroke(g, 0.55, 0.95, W1)
  if (gills && rx > 12) {
    for (let i = -3; i <= 3; i++) {
      const x = cx + (rx * i) / 3.5
      line(g, x, cy + lip * 0.7, cx + (x - cx) * 0.55, cy + lip * 1.35, W3 * 0.8, 0.42)
    }
  }
}

function leaf(g: Ctx, x: number, y: number, len: number, ang: number, wid: number, fill = 0.46) {
  if (len < 2) return
  g.save()
  g.translate(x, y)
  g.rotate(ang)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(len * 0.5, -wid, len, 0)
  g.quadraticCurveTo(len * 0.5, wid, 0, 0)
  g.closePath()
  fillStroke(g, fill, 0.9, W2)
  line(g, 0, 0, len * 0.86, 0, W3 * 0.7, 0.45)
  g.restore()
}

// ── Fungi ──────────────────────────────────────────────────────────────────

interface Life {
  /** Spore scatter at the very beginning. */
  spores: number
  /** Mycelium reach, 0–1. */
  myc: number
  /** Fruiting body size, 0 until the pinhead appears. */
  size: number
  /** Cap opening as it matures, 0–1. */
  open: number
  /** Spore release at the end. */
  rain: number
}

function fungusLife(t: number): Life {
  const appear = sm(0.3, 0.37, t)
  return {
    spores: sm(0, 0.03, t) * (1 - sm(0.1, 0.17, t)),
    myc: sm(0.08, 0.36, t),
    size: appear * (0.14 + 0.86 * sm(0.36, 0.72, t)),
    open: sm(0.58, 0.88, t),
    rain: sm(0.78, 0.88, t) * (1 - sm(0.95, 1, t)),
  }
}

type FungusDraw = (g: Ctx, f: Life, S: number, seed: number, time: number) => void

const button: FungusDraw = (g, f, S, seed, time) => {
  const h = S * 0.52 * f.size
  const w = S * (0.045 + 0.03 * f.size)
  stipe(g, h, w * 1.3, w)
  if (f.size > 0.5) line(g, -w * 1.8, -h * 0.62, w * 1.8, -h * 0.62 + 2, W3, 0.7)
  const rx = S * 0.3 * f.size
  const ry = S * 0.22 * f.size * (1 - 0.4 * f.open)
  cap(g, 0, -h, rx, ry, f.open)
  sporeRain(g, seed, f.rain, 0, -h + ry * 0.4, rx, S * 0.5 - h * 0.2, time)
}

const amanita: FungusDraw = (g, f, S, seed, time) => {
  const h = S * 0.44 * f.size
  const w = S * (0.04 + 0.025 * f.size)
  stipe(g, h, w * 1.25, w)
  if (f.size > 0.2) {
    g.beginPath()
    g.ellipse(0, -S * 0.025 * f.size, w * 2.1, w * 1.7, 0, 0, TAU)
    fillStroke(g, 0.5, 0.9, W2)
  }
  if (f.size > 0.55) {
    g.beginPath()
    g.ellipse(0, -h * 0.74, w * 2.3, w * 0.7, 0, 0, TAU)
    fillStroke(g, 0.2, 0.85, W3)
  }
  const rx = S * 0.34 * f.size
  const ry = S * 0.3 * f.size * (1 - 0.45 * f.open)
  cap(g, 0, -h, rx, ry, f.open, false)
  if (rx > 10) {
    cut(g, 0.95, () => {
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + 0.35 + hr(seed, i) * (Math.PI - 0.7)
        const d = 0.25 + hr(seed, i + 9) * 0.55
        g.beginPath()
        g.ellipse(Math.cos(a) * rx * d, -h + Math.sin(a) * ry * d, 1.6 + rx * 0.07, 1.4 + rx * 0.06, 0, 0, TAU)
        g.fill()
      }
    })
  }
  sporeRain(g, seed, f.rain, 0, -h + 4, rx, S * 0.5, time)
}

const morel: FungusDraw = (g, f, S, seed) => {
  const h = S * 0.24 * f.size
  const w = S * (0.05 + 0.025 * f.size)
  stipe(g, h, w * 1.2, w)
  const ry = S * 0.2 * f.size
  const rx = S * 0.12 * f.size
  if (rx < 2.5) return
  const cy = -h - ry * 0.85
  g.beginPath()
  g.ellipse(0, cy, rx, ry, 0, 0, TAU)
  fillStroke(g, 0.6, 0.95, W1)
  cut(g, 0.85, () => {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        const px = (col - 1 + (row % 2 ? 0.5 : 0)) * rx * 0.62
        const py = cy + (row - 2) * ry * 0.34
        if (Math.abs(px) > rx * 0.85) continue
        g.beginPath()
        g.ellipse(px, py, rx * 0.16 + 0.8, ry * 0.1 + 0.8, 0, 0, TAU)
        g.fill()
      }
    }
  })
  void seed
}

const chanterelle: FungusDraw = (g, f, S) => {
  const h = S * 0.42 * f.size
  const rim = S * 0.27 * f.size * (0.6 + 0.4 * f.open)
  const w = S * 0.045 * (0.6 + f.size * 0.4)
  if (h < 3) return
  g.beginPath()
  g.moveTo(-w, 0)
  g.quadraticCurveTo(-w * 1.1, -h * 0.55, -rim, -h)
  g.quadraticCurveTo(0, -h - rim * 0.34, rim, -h)
  g.quadraticCurveTo(w * 1.1, -h * 0.55, w, 0)
  g.closePath()
  fillStroke(g, 0.46, 0.95, W1)
  g.beginPath()
  g.ellipse(0, -h, rim, rim * 0.26, 0, 0, TAU)
  al(g, 0.9)
  g.lineWidth = W2
  g.stroke()
  if (rim > 8) {
    cut(g, 0.7, () => {
      g.beginPath()
      g.ellipse(0, -h, rim * 0.62, rim * 0.14, 0, 0, TAU)
      g.fill()
    })
  }
}

const puffball: FungusDraw = (g, f, S, seed, time) => {
  const r = S * 0.19 * f.size
  const h = S * 0.06 * f.size
  stipe(g, h, r * 0.34, r * 0.3)
  if (r < 2.5) return
  const cy = -h - r * 0.92
  g.beginPath()
  g.arc(0, cy, r, 0, TAU)
  fillStroke(g, 0.55, 0.95, W1)
  if (r > 10) {
    cut(g, 0.8, () => {
      for (let i = 0; i < 10; i++) {
        const a = hr(seed, i) * TAU
        const d = hr(seed, i + 11) * r * 0.7
        g.beginPath()
        g.arc(Math.cos(a) * d, cy + Math.sin(a) * d, 1.9, 0, TAU)
        g.fill()
      }
    })
  }
  if (f.rain > 0.03) {
    cut(g, 1, () => {
      g.beginPath()
      g.ellipse(0, cy - r * 0.86, r * 0.3, r * 0.14, 0, 0, TAU)
      g.fill()
    })
    for (let i = 0; i < 16; i++) {
      const phase = (time * 0.28 + hr(seed, i + 21)) % 1
      dot(g, Math.sin(phase * 4 + i * 1.7) * (6 + phase * S * 0.14), cy - r - phase * S * 0.55, 2, f.rain * (1 - phase))
    }
  }
}

const coral: FungusDraw = (g, f, S, seed) => {
  const reach = f.size
  if (reach < 0.05) return
  const grow = (x: number, y: number, ang: number, len: number, d: number, w: number, id: number) => {
    const reveal = clamp(reach * 5 - d)
    if (reveal <= 0) return
    const ex = x + Math.cos(ang) * len * reveal
    const ey = y + Math.sin(ang) * len * reveal
    line(g, x, y, ex, ey, w, 0.92)
    if (d >= 4) {
      if (reveal >= 1) dot(g, ex, ey, 2.6, 0.95)
      return
    }
    if (reveal < 1) return
    const kids = d === 0 ? 3 : 2
    for (let i = 0; i < kids; i++) {
      const kid = id * 4 + i + 1
      const turn = (kids === 2 ? (i === 0 ? -1 : 1) : i - 1) * (0.42 + hr(seed, kid) * 0.3)
      grow(ex, ey, ang + turn, len * (0.7 + hr(seed, kid + 5) * 0.12), d + 1, Math.max(W3, w * 0.7), kid)
    }
  }
  grow(0, 0, -Math.PI / 2, S * 0.2, 0, 9, 1)
}

const shiitake: FungusDraw = (g, f, S, seed, time) => {
  const h = S * 0.26 * f.size
  const w = S * 0.04
  stipe(g, h, w * 1.2, w * 0.9)
  const rx = S * 0.4 * f.size
  const ry = S * 0.2 * f.size * (1 - 0.4 * f.open)
  cap(g, 0, -h, rx, ry, f.open)
  if (rx > 14) {
    cut(g, 0.8, () => {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + 0.3 + hr(seed, i) * (Math.PI - 0.6)
        const d = 0.3 + hr(seed, i + 3) * 0.5
        g.beginPath()
        g.ellipse(Math.cos(a) * rx * d, -h + Math.sin(a) * ry * d, 3, 1.4, a, 0, TAU)
        g.fill()
      }
    })
  }
  sporeRain(g, seed, f.rain, 0, -h + 4, rx, S * 0.45, time)
}

const lionsmane: FungusDraw = (g, f, S, seed) => {
  const logW = S * 0.17
  const logH = S * 0.07
  g.beginPath()
  g.roundRect(-logW, -logH, logW * 2, logH, 6)
  fillStroke(g, 0.2, 0.7, W2)
  if (f.size < 0.08) return
  const rx = S * 0.22 * f.size
  const ry = S * 0.17 * f.size
  const cy = -logH - ry - S * 0.14 * f.size // the mass sits above its hanging spines
  g.beginPath()
  g.ellipse(0, cy, rx, ry, 0, 0, TAU)
  fillStroke(g, 0.22, 0.6, W3)
  const spines = 30
  for (let i = 0; i < spines; i++) {
    const a = 0.02 * Math.PI + (i / (spines - 1)) * 0.96 * Math.PI
    const sx = Math.cos(a) * rx * 0.96
    const sy = cy + Math.sin(a) * ry * 0.8
    const len = S * (0.09 + hr(seed, i) * 0.17) * f.size * (0.5 + 0.5 * f.open)
    line(g, sx, sy - 4, sx * 0.92, sy + len, W3 * 1.2, 0.85)
  }
}

const oyster: FungusDraw = (g, f, S, seed, time) => {
  const logW = S * 0.36
  const logH = S * 0.09
  g.beginPath()
  g.roundRect(-logW, -logH, logW * 2, logH, 8)
  fillStroke(g, 0.22, 0.75, W2)
  for (let i = -2; i <= 2; i++) line(g, i * logW * 0.4, -logH * 0.2, i * logW * 0.4 + 5, -logH * 0.8, W3 * 0.7, 0.3)
  // [x, rotation, share of full size]: shells fan out of the log, each at its own stage
  const shells: [number, number, number][] = [
    [-logW * 0.5, -0.62, 1],
    [logW * 0.02, 0.04, 0.88],
    [logW * 0.52, 0.66, 0.74],
  ]
  shells.forEach(([x, rot, share], i) => {
    const grow = clamp((f.size - 0.12 * i) / (1 - 0.12 * i))
    const R = S * 0.36 * share * grow
    if (R < 3) return
    g.save()
    g.translate(x, -logH)
    g.rotate(rot)
    g.beginPath()
    g.moveTo(0, 0)
    g.arc(0, 0, R, -Math.PI / 2 - 0.82, -Math.PI / 2 + 0.82)
    g.closePath()
    fillStroke(g, 0.34, 0.95, W1)
    if (R > 12) {
      for (let k = -3; k <= 3; k++) {
        const a = -Math.PI / 2 + k * 0.2
        line(g, Math.cos(a) * R * 0.18, Math.sin(a) * R * 0.18, Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, W3 * 0.8, 0.5)
      }
    }
    g.restore()
  })
  sporeRain(g, seed, f.rain, 0, -logH, logW * 0.9, S * 0.4, time)
}

const inkcap: FungusDraw = (g, f, S, seed, time) => {
  const h = S * 0.5 * f.size
  const w = S * 0.03
  stipe(g, h, w * 1.1, w)
  const melt = f.rain
  const rx = S * 0.075 * f.size * (1 + 1.3 * f.open) * (1 - melt * 0.45)
  const ry = S * 0.15 * f.size * (1 - 0.35 * f.open) * (1 - melt * 0.3)
  if (rx < 2) return
  g.beginPath()
  g.ellipse(0, -h - ry * 0.7, rx, ry, 0, 0, TAU)
  fillStroke(g, 0.55 - melt * 0.25, 0.95, W1)
  if (melt > 0.05) {
    for (let i = -2; i <= 2; i++) {
      const phase = (time * 0.2 + hr(seed, i + 9)) % 1
      line(g, i * rx * 0.4, -h - ry * 0.3, i * rx * 0.4, -h - ry * 0.3 + melt * S * (0.1 + 0.2 * phase), W3, 0.8 * (1 - phase * 0.5))
    }
  }
}

const mycelium: FungusDraw = (g, f, S, seed) => {
  const cy = -S * 0.32
  g.save()
  g.translate(0, cy)
  const angles = Array.from({ length: 5 }, (_, i) => (i / 5) * TAU + hr(seed, i) * 0.5)
  network(g, seed, f.myc * 1.12, 0, 0, angles, S * 0.2, 3, 0.7, W2)
  g.restore()
  // knots: the first primordia
  const knots = sm(0.55, 0.95, (f.size + f.myc * 0.4) * 0.8)
  if (knots > 0.05) {
    for (let i = 0; i < 5; i++) {
      const a = hr(seed, i + 30) * TAU
      const d = (0.25 + hr(seed, i + 50) * 0.55) * S * 0.36
      dot(g, Math.cos(a) * d, cy + Math.sin(a) * d, 3.6 * knots, 0.95)
    }
  }
  dot(g, 0, cy, 4 * clamp(f.myc * 4), 0.95)
}

const sporeBloom: FungusDraw = (g, f, S, seed, time) => {
  const reveal = sm(0.05, 0.9, f.myc * 0.9 + f.size * 0.3)
  const n = 70
  const cy = -S * 0.34
  const turn = time * 0.06
  for (let i = 0; i < n; i++) {
    if (i / n > reveal) break
    const a = i * 2.39996 + turn
    const r = S * 0.34 * Math.sqrt(i / n)
    dot(g, Math.cos(a) * r, cy + Math.sin(a) * r * 0.95, 2.2 + (i % 7 === 0 ? 1.1 : 0), 0.5 + 0.5 * hr(seed, i))
  }
}

const FUNGUS: Record<(typeof FUNGI)[number], FungusDraw> = {
  oyster,
  button,
  amanita,
  morel,
  chanterelle,
  puffball,
  coral,
  shiitake,
  lionsmane,
  inkcap,
  mycelium,
  spores: sporeBloom,
}

function drawFungus(g: Ctx, kind: (typeof FUNGI)[number], t: number, S: number, seed: number, time: number) {
  const f = fungusLife(t)
  if (kind !== "mycelium" && kind !== "spores") {
    ground(g, S * 0.3)
    spores(g, seed, S * 0.7, f.spores * 0.9, S * 0.12)
    // hyphae in the substrate, thinning out as the fruiting body takes over
    const fade = 1 - 0.45 * f.size
    g.save()
    g.globalAlpha = fade
    network(g, seed, f.myc, 0, 3, [Math.PI / 2 - 0.85, Math.PI / 2, Math.PI / 2 + 0.85], S * 0.13, 3, 0.7, W3)
    g.restore()
  }
  FUNGUS[kind](g, f, S, seed, time)
}

// ── Plants ─────────────────────────────────────────────────────────────────

function drawSeedling(g: Ctx, t: number, S: number, seed: number) {
  ground(g, S * 0.26)
  const seedA = (1 - sm(0.16, 0.3, t)) * sm(0, 0.03, t)
  if (seedA > 0.02) {
    g.beginPath()
    g.ellipse(0, S * 0.045, 6, 4, 0.3, 0, TAU)
    al(g, 0.95 * seedA)
    g.fill()
  }
  network(g, seed, sm(0.1, 0.58, t), 0, 2, [Math.PI / 2 - 0.3, Math.PI / 2 + 0.3], S * 0.12, 3, 0.5, W2)
  const h = S * 0.58 * sm(0.14, 0.7, t)
  if (h < 3) return
  const lean = S * 0.03
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(lean, -h * 0.55, 0, -h)
  al(g, 0.95)
  g.lineWidth = W1 * 0.8
  g.stroke()
  const cot = sm(0.3, 0.46, t)
  leaf(g, 0, -h, S * 0.14 * cot, -Math.PI * 0.12, S * 0.05 * cot)
  leaf(g, 0, -h, S * 0.14 * cot, -Math.PI * 0.88, S * 0.05 * cot)
  const pairs: [number, number][] = [
    [0.55, sm(0.46, 0.72, t)],
    [0.8, sm(0.58, 0.86, t)],
    [1, sm(0.7, 0.96, t)],
  ]
  pairs.forEach(([at, grow], i) => {
    const len = S * (0.2 - i * 0.02) * grow
    const y = -h * at
    leaf(g, 0, y, len, -Math.PI * (0.16 + i * 0.04), len * 0.3)
    leaf(g, 0, y, len, -Math.PI * (0.84 - i * 0.04), len * 0.3)
  })
}

function drawFern(g: Ctx, t: number, S: number, seed: number) {
  ground(g, S * 0.28)
  network(g, seed, sm(0.05, 0.4, t), 0, 2, [Math.PI / 2 - 0.6, Math.PI / 2 + 0.6], S * 0.1, 2, 0.5, W3)
  const frond = (dir: number, length: number, delay: number) => {
    const unroll = sm(0.18 + delay, 0.78 + delay * 0.5, t)
    const emerge = sm(0.1 + delay, 0.26 + delay, t)
    if (emerge <= 0) return
    const steps = 26
    const total = length * emerge * (0.35 + 0.65 * unroll)
    let x = 0
    let y = 0
    let ang = -Math.PI / 2 + dir * 0.5
    const pts: [number, number, number][] = [[0, 0, ang]]
    for (let i = 1; i <= steps; i++) {
      const u = i / steps
      const curl = (1 - unroll) * 7 * u * u + unroll * 0.55 * Math.max(0, u - 0.5)
      ang += dir * curl * (1 / steps) * 2.2
      x += Math.cos(ang) * (total / steps)
      y += Math.sin(ang) * (total / steps)
      pts.push([x, y, ang])
    }
    g.beginPath()
    pts.forEach(([px, py], i) => (i === 0 ? g.moveTo(px, py) : g.lineTo(px, py)))
    al(g, 0.95)
    g.lineWidth = W2
    g.stroke()
    pts.forEach(([px, py, a], i) => {
      if (i < 3 || i === pts.length - 1 || i % 2 === 1) return
      const u = i / steps
      const open = clamp((unroll * 1.35 - u) * 1.6)
      const len = S * 0.19 * Math.sin(Math.PI * Math.min(1, u * 1.05)) * (1 - u * 0.4) * open
      if (len < 2) return
      for (const side of [-1, 1]) {
        const pa = a + side * (Math.PI / 2 - 0.35)
        line(g, px, py, px + Math.cos(pa) * len, py + Math.sin(pa) * len, W3 * 1.1, 0.78)
      }
    })
  }
  frond(1, S * 1.0, 0)
  frond(-1, S * 0.82, 0.07)
  frond(0.15, S * 0.6, 0.16)
}

function drawGrass(g: Ctx, t: number, S: number, seed: number) {
  ground(g, S * 0.24)
  for (let i = 0; i < 9; i++) {
    const grow = sm(0.08 + i * 0.035, 0.5 + i * 0.04, t)
    if (grow <= 0.02) continue
    const x = (i - 4) * S * 0.035
    const height = S * (0.4 + hr(seed, i) * 0.5) * grow
    const bend = (hr(seed, i + 20) - 0.5) * S * 0.3 * grow
    g.beginPath()
    g.moveTo(x, 0)
    g.quadraticCurveTo(x + bend * 0.15, -height * 0.62, x + bend, -height)
    al(g, 0.9)
    g.lineWidth = W2 + (i % 3 === 0 ? 1 : 0)
    g.stroke()
    if (t > 0.68 && i % 3 === 1) {
      for (let k = 0; k < 4; k++) dot(g, x + bend + (k % 2 ? 2.5 : -2.5), -height + k * 8 + 2, 2.2, 0.9 * sm(0.68, 0.8, t))
    }
  }
}

function drawFlower(g: Ctx, t: number, S: number, seed: number) {
  ground(g, S * 0.24)
  const seedA = (1 - sm(0.1, 0.2, t)) * sm(0, 0.03, t)
  if (seedA > 0.02) dot(g, 0, S * 0.04, 4.5, 0.95 * seedA)
  network(g, seed, sm(0.08, 0.5, t), 0, 2, [Math.PI / 2 - 0.4, Math.PI / 2 + 0.4], S * 0.1, 3, 0.5, W2)
  const h = S * 0.62 * sm(0.12, 0.54, t)
  if (h < 3) return
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(S * 0.04, -h * 0.5, 0, -h)
  al(g, 0.95)
  g.lineWidth = W2
  g.stroke()
  const lf = sm(0.26, 0.5, t)
  leaf(g, S * 0.01, -h * 0.28, S * 0.17 * lf, -Math.PI * 0.2, S * 0.05 * lf)
  leaf(g, S * 0.02, -h * 0.5, S * 0.15 * lf, -Math.PI * 0.8, S * 0.045 * lf)
  const bud = sm(0.46, 0.6, t) * (1 - sm(0.6, 0.68, t))
  if (bud > 0.02) {
    g.beginPath()
    g.ellipse(0, -h - 5, 5.5 * bud + 1, 9 * bud + 1, 0, 0, TAU)
    fillStroke(g, 0.7, 0.95, W3)
  }
  const bloom = sm(0.58, 0.76, t)
  if (bloom <= 0.02) return
  const wilt = sm(0.86, 1, t)
  const R = S * 0.17 * bloom
  const n = 11
  for (let i = 0; i < n; i++) {
    const fall = wilt * S * 0.34 * (0.3 + hr(seed, i))
    g.save()
    g.translate(Math.sin(i * 2.1) * wilt * 10, -h + fall)
    g.rotate((i / n) * TAU + wilt * (hr(seed, i + 5) - 0.5) * 3)
    g.beginPath()
    g.ellipse(0, -R * 0.62, R * 0.2, R * 0.46, 0, 0, TAU)
    fillStroke(g, 0.55, 0.85, W3 * 1.2)
    g.restore()
  }
  g.beginPath()
  g.arc(0, -h, R * 0.3, 0, TAU)
  fillStroke(g, 0.95, 1, W3)
}

function drawTree(g: Ctx, t: number, S: number, seed: number) {
  ground(g, S * 0.3)
  const seedA = (1 - sm(0.08, 0.16, t)) * sm(0, 0.03, t)
  if (seedA > 0.02) dot(g, 0, S * 0.04, 4.8, 0.95 * seedA)
  network(g, seed, sm(0.06, 0.55, t), 0, 3, [Math.PI / 2 - 0.9, Math.PI / 2, Math.PI / 2 + 0.9], S * 0.13, 3, 0.7, W2)
  const p = sm(0.12, 0.8, t)
  const foliage = sm(0.5, 0.74, t)
  const leaves: [number, number, number][] = []
  const branch = (x: number, y: number, ang: number, len: number, d: number, w: number, id: number) => {
    const reveal = clamp(p * 5 - d)
    if (reveal <= 0) return
    const ex = x + Math.cos(ang) * len * reveal
    const ey = y + Math.sin(ang) * len * reveal
    line(g, x, y, ex, ey, Math.max(W3, w), 0.92)
    if (reveal < 1) return
    if (d >= 4) {
      leaves.push([ex, ey, id])
      return
    }
    for (let i = 0; i < 2; i++) {
      const kid = id * 3 + i + 1
      const turn = (i === 0 ? -1 : 1) * (0.42 + hr(seed, kid) * 0.35)
      branch(ex, ey, ang + turn, len * (0.72 + hr(seed, kid + 7) * 0.12), d + 1, w * 0.66, kid)
    }
  }
  branch(0, 0, -Math.PI / 2, S * 0.27, 0, 10, 1)
  if (foliage > 0.02) {
    leaves.forEach(([x, y, id]) => {
      for (let k = 0; k < 3; k++) {
        dot(g, x + (hr(seed, id + k) - 0.5) * 16, y + (hr(seed, id + k + 40) - 0.5) * 14 - 3, (3.4 + hr(seed, id + k + 80) * 1.6) * foliage, 0.78)
      }
    })
  }
}

function drawSucculent(g: Ctx, t: number, S: number) {
  ground(g, S * 0.24)
  const cy = -S * 0.02
  for (let layer = 4; layer >= 0; layer--) {
    const grow = sm(0.06 + layer * 0.1, 0.46 + layer * 0.1, t)
    if (grow <= 0.02) continue
    const count = 3 + layer
    const spread = Math.PI * (0.06 + layer * 0.085)
    const len = S * (0.2 + layer * 0.055) * grow
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1) - 0.5
      leaf(g, 0, cy, len, -Math.PI / 2 + u * 2 * spread, len * 0.09, 0.5)
    }
  }
  const stalk = sm(0.66, 0.9, t)
  if (stalk > 0.02) {
    const h = S * 0.62 * stalk
    line(g, 0, cy - S * 0.08, S * 0.02, cy - h, W3, 0.9)
    for (let i = 0; i < 4; i++) dot(g, S * 0.02 + (i - 1.5) * 5, cy - h + (i % 2) * 6, 3.2 * stalk, 0.95)
  }
}

// ── Entry point ────────────────────────────────────────────────────────────

/** Draws one specimen at `time` (seconds) onto a mask context whose units are CSS pixels. */
export function drawSpecimen(g: Ctx, specimen: Specimen, time: number): void {
  const life = time / specimen.period + specimen.offset
  const cycle = Math.floor(life)
  const t = life - cycle
  const kind = KINDS[(Math.max(0, KINDS.indexOf(specimen.kind)) + (cycle > 0 ? cycle : 0) * KIND_STRIDE) % KINDS.length]
  const seed = specimen.seed + (cycle > 0 ? cycle : 0) * 101
  env = sm(0, 0.03, t) * (1 - sm(0.94, 1, t))
  if (env <= 0.01) return
  const sway = Math.sin(time * 0.7 + specimen.seed) * 0.025
  g.save()
  g.translate(specimen.x, specimen.y)
  g.transform(1, 0, sway, 1, 0, 0)
  g.fillStyle = "#fff"
  g.strokeStyle = "#fff"
  g.lineCap = "round"
  g.lineJoin = "round"
  const S = specimen.size
  switch (kind) {
    case "seedling":
      drawSeedling(g, t, S, seed)
      break
    case "fern":
      drawFern(g, t, S, seed)
      break
    case "grass":
      drawGrass(g, t, S, seed)
      break
    case "flower":
      drawFlower(g, t, S, seed)
      break
    case "tree":
      drawTree(g, t, S, seed)
      break
    case "succulent":
      drawSucculent(g, t, S)
      break
    default:
      drawFungus(g, kind, t, S, seed, time)
  }
  g.restore()
}
