"use client"

import { useEffect, useRef } from "react"

import type { LabThemeId } from "../../data/model"
import { startGlyphField } from "./glyph-engine"

/**
 * Decorative character-art background: fungi and plants of every kind, each at its own point of
 * growth (spores, mycelium, pinheads, seedlings, blooms…), drawn with glyphs. Purely visual: it is
 * hidden from assistive tech, never takes pointer events, and holds still under reduced motion.
 */
export function GlyphField({ theme }: { theme: LabThemeId }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    return startGlyphField(canvas, theme)
  }, [theme])

  return <canvas ref={ref} aria-hidden className="hv2-glyphs" />
}
