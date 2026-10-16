/**
 * Demonstration pictures of the example crop (oyster mushroom, colonization).
 *
 * These are NOT photographs and NOT captures of any crop: they are procedural
 * illustrations of ONE substrate block photographed from above on different days,
 * so the gallery, transitions and timeline can be reviewed without storage.
 * The same inoculation points grow from picture to picture (continuity, not six
 * variations of one image). Every consumer must label them as demo
 * (PhotoModel.kind === "demo"). Deterministic: no randomness at render time.
 *
 * The app does NOT run this at runtime: it ships the pre-rendered WebP files in
 * public/demo/oyster (see assets.ts and docs/HOME_V2_DESIGN_LAB.md for how they were produced).
 * Real, licensed photographs would replace those files. Nothing here depicts fruiting
 * bodies: the example crop is still in colonization.
 */

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f = (n: number) => n.toFixed(1)

/** Inoculation points on the substrate block (viewBox 800×1000). */
const SEEDS: { x: number; y: number; vigor: number; angle: number }[] = [
  { x: 270, y: 330, vigor: 1.05, angle: 20 },
  { x: 540, y: 300, vigor: 0.9, angle: -15 },
  { x: 400, y: 520, vigor: 1.15, angle: 60 },
  { x: 250, y: 700, vigor: 0.95, angle: -30 },
  { x: 560, y: 690, vigor: 1.0, angle: 35 },
  { x: 410, y: 800, vigor: 0.8, angle: 10 },
  { x: 175, y: 500, vigor: 0.85, angle: -50 },
  { x: 625, y: 505, vigor: 0.9, angle: 45 },
]

/** Share of the block covered by mycelium: 0 on day 1 → ~0.93 on day 11 (fast at first, slowing as it fills). */
export function colonizationCover(day: number): number {
  const t = Math.min(1, Math.max(0, (day - 1) / 10))
  return (1 - Math.pow(1 - t, 1.7)) * 0.93
}

/** `macro` crops into the block (no bag edges) for hero use; the picture is the same scene, rendered tighter. */
export function oysterFrameSvg(day: number, macro = false): string {
  const cover = colonizationCover(day)
  const rand = mulberry32(2025)
  const view = mulberry32(day * 977 + 13)
  const parts: string[] = []

  // ── substrate: straw and sawdust ──
  const straw: string[] = []
  const palette = ["#a88a5c", "#7d6039", "#b89c68", "#4f3923", "#94744a"]
  for (let i = 0; i < 300; i++) {
    const x = 120 + rand() * 560
    const y = 160 + rand() * 680
    const len = 14 + rand() * 34
    const a = rand() * Math.PI
    straw.push(
      `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + Math.cos(a) * len)}" y2="${f(y + Math.sin(a) * len)}" stroke="${palette[Math.floor(rand() * palette.length)]}" stroke-opacity="${f(0.3 + rand() * 0.4)}" stroke-width="${f(1.2 + rand() * 2.2)}" stroke-linecap="round"/>`,
    )
  }
  parts.push(
    `<g clip-path="url(#block)"><rect x="100" y="140" width="600" height="720" fill="url(#sub)"/>${straw.join("")}<rect x="100" y="140" width="600" height="720" filter="url(#grain)" opacity="0.3"/></g>`,
  )

  // ── spawn grains: visible at the start, covered as the mycelium takes over ──
  const grainOpacity = Math.max(0, 0.95 - cover * 1.1)
  if (grainOpacity > 0.02) {
    const grains: string[] = []
    SEEDS.forEach((seed) => {
      for (let g = 0; g < 7; g++) {
        const a = rand() * Math.PI * 2
        const d = rand() * 46
        grains.push(
          `<ellipse cx="${f(seed.x + Math.cos(a) * d)}" cy="${f(seed.y + Math.sin(a) * d)}" rx="${f(5 + rand() * 3)}" ry="${f(4 + rand() * 2.4)}" fill="#e8dcae" opacity="${f(grainOpacity)}"/>`,
        )
      }
    })
    parts.push(`<g clip-path="url(#block)">${grains.join("")}</g>`)
  }

  // ── mycelium ──
  if (cover > 0.015) {
    const glows: string[] = []
    const threads: string[] = []
    const tuftsOut: string[] = []
    SEEDS.forEach((seed) => {
      const reach = (28 + cover * 250 * seed.vigor) * (0.88 + rand() * 0.24)
      // Irregular patch: several overlapping soft blobs instead of one perfect ellipse.
      for (let b = 0; b < 6; b++) {
        const a = rand() * Math.PI * 2
        const d = reach * rand() * 0.45
        const r = reach * (0.42 + rand() * 0.38)
        glows.push(
          `<ellipse cx="${f(seed.x + Math.cos(a) * d)}" cy="${f(seed.y + Math.sin(a) * d)}" rx="${f(r)}" ry="${f(r * (0.7 + rand() * 0.3))}" transform="rotate(${f(seed.angle + rand() * 90)} ${seed.x} ${seed.y})" fill="url(#hy)" opacity="${f(0.3 + cover * 0.4)}"/>`,
        )
      }
      const strands = 46
      for (let i = 0; i < strands; i++) {
        const a = (i / strands) * Math.PI * 2 + rand() * 0.25
        const len = reach * (0.3 + rand() * 0.6)
        const bend = (rand() - 0.5) * 1.5
        const x2 = seed.x + Math.cos(a + bend) * len
        const y2 = seed.y + Math.sin(a + bend) * len
        const cx = seed.x + Math.cos(a - bend * 0.8) * len * 0.55
        const cy = seed.y + Math.sin(a - bend * 0.8) * len * 0.55
        const op = 0.18 + rand() * 0.4
        threads.push(
          `<path d="M${f(seed.x)} ${f(seed.y)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}" stroke="#f6f1e2" stroke-opacity="${f(op)}" stroke-width="${f(0.5 + rand() * 1.0)}" fill="none" stroke-linecap="round"/>`,
        )
        for (let k = 0; k < 2; k++) {
          if (rand() > 0.6) continue
          const t = 0.35 + rand() * 0.55
          const bx = seed.x + (x2 - seed.x) * t
          const by = seed.y + (y2 - seed.y) * t
          const ba = a + bend * 0.5 + (rand() - 0.5) * 2.2
          const bl = len * (0.15 + rand() * 0.3)
          threads.push(
            `<path d="M${f(bx)} ${f(by)} Q${f(bx + Math.cos(ba + 0.6) * bl * 0.6)} ${f(by + Math.sin(ba + 0.6) * bl * 0.6)} ${f(bx + Math.cos(ba) * bl)} ${f(by + Math.sin(ba) * bl)}" stroke="#f6f1e2" stroke-opacity="${f(op * 0.8)}" stroke-width="${f(0.4 + rand() * 0.7)}" fill="none" stroke-linecap="round"/>`,
          )
        }
      }
      const tufts = Math.round(10 + cover * 48)
      for (let i = 0; i < tufts; i++) {
        const a = rand() * Math.PI * 2
        const d = reach * Math.pow(rand(), 0.8) * 0.95
        const r = (9 + rand() * 24) * (0.55 + cover * 0.7)
        tuftsOut.push(
          `<circle cx="${f(seed.x + Math.cos(a) * d)}" cy="${f(seed.y + Math.sin(a) * d)}" r="${f(r)}" fill="url(#tuft)" opacity="${f(0.4 + cover * 0.25 + rand() * 0.35)}"/>`,
        )
      }
    })
    parts.push(`<g clip-path="url(#block)"><g filter="url(#soft)">${glows.join("")}</g><g filter="url(#puff)">${tuftsOut.join("")}</g>${threads.join("")}</g>`)
  }

  // ── bag sheen + rim light ──
  parts.push(
    `<rect x="100" y="140" width="600" height="720" rx="78" fill="url(#sheen)"/>` +
      `<rect x="100" y="140" width="600" height="720" rx="78" fill="none" stroke="url(#rim)" stroke-width="3"/>`,
  )

  // Each day is shot slightly differently (framing and exposure), like real pictures.
  const rot = (view() - 0.5) * 4
  const dx = (view() - 0.5) * 26
  const dy = (view() - 0.5) * 26
  const zoom = 1 + view() * 0.05
  const dim = view() * 0.1

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${macro ? "80 200 640 800" : "0 0 800 1000"}">` +
    `<defs>` +
    `<radialGradient id="bg" cx="50%" cy="32%" r="85%"><stop offset="0" stop-color="#16302a"/><stop offset="0.6" stop-color="#0a1612"/><stop offset="1" stop-color="#050a08"/></radialGradient>` +
    `<linearGradient id="sub" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#5e4429"/><stop offset="0.55" stop-color="#443020"/><stop offset="1" stop-color="#2b1e13"/></linearGradient>` +
    `<radialGradient id="tuft" cx="42%" cy="38%" r="62%"><stop offset="0" stop-color="#fffdf5"/><stop offset="0.6" stop-color="#efe8d2" stop-opacity="0.8"/><stop offset="1" stop-color="#8a7b5d" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="hy"><stop offset="0" stop-color="#fffdf3" stop-opacity="0.95"/><stop offset="0.5" stop-color="#f3ecd6" stop-opacity="0.55"/><stop offset="1" stop-color="#eee6cc" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="0.35" stop-color="#ffffff" stop-opacity="0.02"/><stop offset="1" stop-color="#06201a" stop-opacity="0.32"/></linearGradient>` +
    `<linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cf5c8" stop-opacity="0.5"/><stop offset="0.5" stop-color="#7cf5c8" stop-opacity="0.08"/><stop offset="1" stop-color="#52d6f2" stop-opacity="0.4"/></linearGradient>` +
    `<radialGradient id="gradeA" cx="14%" cy="86%" r="62%"><stop offset="0" stop-color="#19e6a2" stop-opacity="0.3"/><stop offset="1" stop-color="#19e6a2" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="gradeB" cx="90%" cy="8%" r="55%"><stop offset="0" stop-color="#3cc8ee" stop-opacity="0.22"/><stop offset="1" stop-color="#3cc8ee" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="vig" cx="50%" cy="46%" r="78%"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient>` +
    `<clipPath id="block"><rect x="100" y="140" width="600" height="720" rx="78"/></clipPath>` +
    `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.95  0 0 0 0 0.88  0 0 0 0 0.74  0 0 0 0.5 -0.05"/></filter>` +
    `<filter id="puff" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.6" result="b"/><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="11" result="n"/><feDisplacementMap in="b" in2="n" scale="30" xChannelSelector="G" yChannelSelector="R"/></filter>` +
    `<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" result="b"/><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="3" result="n"/><feDisplacementMap in="b" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G"/></filter>` +
    `</defs>` +
    `<rect width="800" height="1000" fill="url(#bg)"/>` +
    `<g transform="translate(${f(400 + dx)} ${f(500 + dy)}) rotate(${f(rot)}) scale(${f(zoom)}) translate(-400 -500)">` +
    `<ellipse cx="400" cy="900" rx="330" ry="40" fill="#000" opacity="0.5" filter="url(#soft)"/>` +
    parts.join("") +
    `</g>` +
    `<rect width="800" height="1000" fill="#000" opacity="${f(macro ? dim * 0.4 : dim)}"/>` +
    `<rect width="800" height="1000" fill="url(#gradeA)" style="mix-blend-mode:screen"/>` +
    `<rect width="800" height="1000" fill="url(#gradeB)" style="mix-blend-mode:screen"/>` +
    `<rect width="800" height="1000" fill="url(#vig)" opacity="${macro ? "0.45" : "1"}"/>` +
    `</svg>`
  )
}
