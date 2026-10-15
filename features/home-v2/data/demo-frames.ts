/**
 * Demonstration illustrations for the photo UI.
 *
 * These are NOT photographs and NOT captures of any crop. They exist so the
 * photo timeline, transitions and gallery can be reviewed in the design lab
 * when no storage is available. Every consumer must label them as demo
 * (PhotoModel.kind === "demo"). Deterministic: no randomness at render time.
 */
import type { PhotoModel } from "./model"

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

/** Inoculation points on the substrate (viewBox 800×1000). */
const POINTS: [number, number][] = [[250, 400], [560, 360], [410, 610], [270, 800], [570, 780]]

/** progress 0 → bare substrate with inoculation points, 1 → fruiting bodies. */
export function demoFrameSvg(progress: number): string {
  const p = Math.min(1, Math.max(0, progress))
  const rand = mulberry32(11)
  const parts: string[] = []

  POINTS.forEach(([x, y], k) => {
    const lag = k * 0.06
    const reach = Math.min(1, Math.max(0, (p - lag) * 1.25))
    // Inoculation point is always visible.
    parts.push(`<circle cx="${x}" cy="${y}" r="9" fill="#f6f1e0" opacity="0.55"/>`)
    if (reach <= 0.02) return
    const radius = (120 + rand() * 90) * reach
    parts.push(`<circle cx="${x}" cy="${y}" r="${f(radius)}" fill="url(#hy)" opacity="${f(0.25 + reach * 0.6)}"/>`)
    parts.push(`<circle cx="${x}" cy="${y}" r="${f(radius * 0.5)}" fill="url(#core)" opacity="${f(0.2 + reach * 0.55)}"/>`)
    const threads = 16
    for (let i = 0; i < threads; i++) {
      const angle = (i / threads) * Math.PI * 2 + rand() * 0.4
      const len = radius * (0.75 + rand() * 0.6)
      const bend = (rand() - 0.5) * 0.9
      const x2 = x + Math.cos(angle + bend) * len
      const y2 = y + Math.sin(angle + bend) * len
      const cx = x + Math.cos(angle) * len * 0.55
      const cy = y + Math.sin(angle) * len * 0.55
      parts.push(`<path d="M${x} ${y} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}" stroke="#f1ecd9" stroke-opacity="${f(0.1 + reach * 0.3)}" stroke-width="${f(0.8 + rand() * 1.2)}" fill="none" stroke-linecap="round"/>`)
    }
  })

  if (p > 0.62) {
    const grow = Math.min(1, (p - 0.62) / 0.38)
    const clusters: [number, number, number][] = [[410, 520, 1.2], [300, 700, 0.95], [540, 690, 1]]
    clusters.forEach(([cx, cy, scale], c) => {
      for (let i = 0; i < 5; i++) {
        const x = cx + (rand() - 0.5) * 150
        const y = cy + (rand() - 0.5) * 90
        const w = (46 + rand() * 30) * scale * (0.3 + grow * 0.7)
        const h = w * (0.55 + rand() * 0.15)
        const tilt = (rand() - 0.5) * 24
        parts.push(
          `<g transform="rotate(${f(tilt)} ${f(x)} ${f(y)})" opacity="${f(Math.min(1, grow * 1.5 - c * 0.1))}">` +
            `<path d="M${f(x - w)} ${f(y)} C${f(x - w)} ${f(y - h * 1.4)} ${f(x + w)} ${f(y - h * 1.4)} ${f(x + w)} ${f(y)} C${f(x + w * 0.6)} ${f(y + h * 0.55)} ${f(x - w * 0.6)} ${f(y + h * 0.55)} ${f(x - w)} ${f(y)}Z" fill="url(#cap)"/>` +
            `<path d="M${f(x - w * 0.7)} ${f(y + h * 0.1)} Q${f(x)} ${f(y + h * 0.45)} ${f(x + w * 0.7)} ${f(y + h * 0.1)}" stroke="#7d765f" stroke-opacity="0.45" stroke-width="1.4" fill="none"/>` +
            `</g>`,
        )
      }
    })
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14231b"/><stop offset="0.55" stop-color="#241a12"/><stop offset="1" stop-color="#150e08"/></linearGradient>` +
    `<radialGradient id="hy"><stop offset="0" stop-color="#fbf6e4" stop-opacity="0.9"/><stop offset="0.55" stop-color="#e9e2c8" stop-opacity="0.45"/><stop offset="1" stop-color="#e9e2c8" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="core"><stop offset="0" stop-color="#fffdf2"/><stop offset="1" stop-color="#fffdf2" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2ecd8"/><stop offset="1" stop-color="#aaa28a"/></linearGradient>` +
    `<radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.65"/></radialGradient>` +
    `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.85  0 0 0 0.09 0"/></filter>` +
    `</defs>` +
    `<rect width="800" height="1000" fill="url(#bg)"/>` +
    `<rect width="800" height="1000" filter="url(#grain)"/>` +
    parts.join("") +
    `<rect width="800" height="1000" fill="url(#vig)"/>` +
    `</svg>`
  )
}

export function demoFrameUrl(progress: number): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(demoFrameSvg(progress))}`
}

const DAY = 24 * 60 * 60 * 1000

/** Evenly spaced demonstration frames between the run start and now. */
export function buildDemoPhotos(startedAt: string, now: string | Date): PhotoModel[] {
  const start = new Date(startedAt).getTime()
  const end = new Date(now).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return []
  const days = (end - start) / DAY
  const count = Math.min(8, Math.max(3, Math.floor(days / 2) + 1))
  return Array.from({ length: count }, (_, i): PhotoModel => {
    const t = count === 1 ? 1 : i / (count - 1)
    return {
      id: `demo-${i}`,
      url: demoFrameUrl(t),
      capturedAt: new Date(start + t * (end - start) - (i === count - 1 ? 2 * 60 * 60 * 1000 : 0)).toISOString(),
      kind: "demo",
    }
  })
}
