import type { LabThemeId } from "../../data/model"
import { drawSpecimen, layoutSpecimens, type Specimen } from "./glyph-specimens"

/**
 * Character-art background. A grid of monospace glyphs, dim everywhere, bright where a fungus or
 * plant is drawn. The drawing happens on a tiny mask canvas (one pixel per character cell), so the
 * antialiased coverage of each pixel becomes the brightness of its glyph. Cost per frame is one
 * small `getImageData` plus one `drawImage` per cell, throttled to ~14 fps and paused while hidden.
 */

const GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const LEVELS = 10
const CELL_W = 4.6
const CELL_H = 7.6
const MAX_CELLS = 26000
const FPS = 14
const MAX_DPR = 2

type Rgb = readonly [number, number, number]
interface Palette {
  /** Dim → bright, interpolated across the brightness levels. */
  stops: readonly [Rgb, Rgb, Rgb]
  alphaLow: number
  alphaHigh: number
}

const PALETTES: Record<LabThemeId, Palette> = {
  negro: { stops: [[28, 104, 122], [52, 211, 153], [214, 255, 238]], alphaLow: 0.1, alphaHigh: 1 },
  verde: { stops: [[48, 128, 108], [110, 235, 150], [226, 255, 226]], alphaLow: 0.12, alphaHigh: 1 },
  blanco: { stops: [[132, 176, 156], [34, 142, 102], [12, 74, 52]], alphaLow: 0.14, alphaHigh: 0.95 },
}

function levelColor(palette: Palette, level: number): string {
  const u = level / (LEVELS - 1)
  const [a, b, c] = palette.stops
  const [from, to, k] = u < 0.55 ? [a, b, u / 0.55] : [b, c, (u - 0.55) / 0.45]
  const r = Math.round(from[0] + (to[0] - from[0]) * k)
  const g = Math.round(from[1] + (to[1] - from[1]) * k)
  const bl = Math.round(from[2] + (to[2] - from[2]) * k)
  const alpha = palette.alphaLow + (palette.alphaHigh - palette.alphaLow) * Math.pow(u, 1.15)
  return `rgba(${r},${g},${bl},${alpha.toFixed(3)})`
}

interface Layout {
  width: number
  height: number
  cols: number
  rows: number
  cw: number
  ch: number
  tileW: number
  tileH: number
  dpr: number
  specimens: Specimen[]
  glyph: Uint8Array
  base: Uint8Array
  phase: Float32Array
}

function buildAtlas(palette: Palette, tileW: number, tileH: number): HTMLCanvasElement {
  const atlas = document.createElement("canvas")
  atlas.width = GLYPHS.length * tileW
  atlas.height = LEVELS * tileH
  const g = atlas.getContext("2d")
  if (!g) return atlas
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.font = `${Math.min(tileW / 0.6, tileH)}px ui-monospace, "Geist Mono", SFMono-Regular, Menlo, Consolas, monospace`
  for (let level = 0; level < LEVELS; level++) {
    g.fillStyle = levelColor(palette, level)
    for (let i = 0; i < GLYPHS.length; i++) g.fillText(GLYPHS[i], i * tileW + tileW / 2, level * tileH + tileH / 2 + 0.5)
  }
  return atlas
}

/** Starts the field on `canvas`. Returns the function that stops it and releases everything. */
export function startGlyphField(canvas: HTMLCanvasElement, theme: LabThemeId): () => void {
  const ctx = canvas.getContext("2d")
  const mask = document.createElement("canvas")
  const maskCtx = mask.getContext("2d", { willReadFrequently: true })
  if (!ctx || !maskCtx) return () => {}

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const palette = PALETTES[theme] ?? PALETTES.negro

  let layout: Layout | null = null
  let atlas: HTMLCanvasElement | null = null
  let raf = 0
  let last = 0
  let rolling = 0x9e3779b9
  const roll = () => {
    rolling = (Math.imul(rolling, 1664525) + 1013904223) >>> 0
    return rolling / 4294967296
  }

  function build() {
    const width = window.innerWidth
    const height = window.innerHeight
    if (layout && layout.width === width && Math.abs(layout.height - height) < 120) return false

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const coarse = Math.max(1, Math.sqrt(((width / CELL_W) * (height / CELL_H)) / MAX_CELLS))
    const cw = CELL_W * coarse
    const ch = CELL_H * coarse
    const cols = Math.ceil(width / cw)
    const rows = Math.ceil(height / ch)
    const tileW = Math.max(4, Math.round(cw * dpr))
    const tileH = Math.max(6, Math.round(ch * dpr))

    canvas.width = cols * tileW
    canvas.height = rows * tileH
    // Cover the viewport exactly: tiles are whole device pixels, so stretch them a hair to fit the cells.
    canvas.style.width = `${cols * cw}px`
    canvas.style.height = `${rows * ch}px`
    mask.width = cols
    mask.height = rows

    const cells = cols * rows
    const glyph = new Uint8Array(cells)
    const base = new Uint8Array(cells)
    const phase = new Float32Array(cells)
    for (let i = 0; i < cells; i++) {
      glyph[i] = Math.floor(roll() * GLYPHS.length)
      base[i] = roll() < 0.72 ? 0 : 1
      phase[i] = roll() * 6.283
    }

    if (!layout || layout.tileW !== tileW || layout.tileH !== tileH) atlas = buildAtlas(palette, tileW, tileH)
    layout = { width, height, cols, rows, cw, ch, tileW, tileH, dpr, specimens: layoutSpecimens(width, height), glyph, base, phase }
    return true
  }

  function render(time: number) {
    if (!layout || !atlas) return
    const { cols, rows, cw, ch, tileW, tileH, specimens, glyph, base, phase } = layout

    maskCtx!.setTransform(1, 0, 0, 1, 0, 0)
    maskCtx!.clearRect(0, 0, cols, rows)
    maskCtx!.setTransform(1 / cw, 0, 0, 1 / ch, 0, 0)
    for (const specimen of specimens) drawSpecimen(maskCtx!, specimen, time)
    maskCtx!.globalAlpha = 1
    const alpha = maskCtx!.getImageData(0, 0, cols, rows).data

    ctx!.clearRect(0, 0, canvas.width, canvas.height)
    const animate = !reduce.matches
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col
        let level = base[i]
        const a = alpha[i * 4 + 3]
        if (a > 12) {
          const shimmer = animate ? 1 + 0.1 * Math.sin(time * 2.2 + phase[i]) : 1
          const lit = Math.min(LEVELS - 1, Math.floor(Math.pow((a / 255) * shimmer, 0.82) * LEVELS * 1.2))
          if (lit > level) level = lit
        }
        if (animate && roll() < 0.012) glyph[i] = Math.floor(roll() * GLYPHS.length)
        ctx!.drawImage(atlas, glyph[i] * tileW, level * tileH, tileW, tileH, col * tileW, row * tileH, tileW, tileH)
      }
    }
  }

  const now = () => Date.now() / 1000

  const frame = (stamp: number) => {
    raf = requestAnimationFrame(frame)
    if (stamp - last < 1000 / FPS) return
    last = stamp
    render(now())
  }

  const start = () => {
    cancelAnimationFrame(raf)
    if (reduce.matches || document.visibilityState !== "visible") return
    raf = requestAnimationFrame(frame)
  }

  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  const onResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (build()) render(now())
    }, 150)
  }
  const onVisibility = () => {
    cancelAnimationFrame(raf)
    if (document.visibilityState === "visible") {
      render(now())
      start()
    }
  }
  const onMotion = () => {
    render(now())
    start()
  }

  build()
  render(now())
  start()
  window.addEventListener("resize", onResize)
  document.addEventListener("visibilitychange", onVisibility)
  reduce.addEventListener("change", onMotion)

  return () => {
    cancelAnimationFrame(raf)
    if (resizeTimer) clearTimeout(resizeTimer)
    window.removeEventListener("resize", onResize)
    document.removeEventListener("visibilitychange", onVisibility)
    reduce.removeEventListener("change", onMotion)
  }
}
