import type { SVGProps } from "react"
import { Camera, Check, CircleAlert, Droplet, Thermometer, Waves, Weight, Wifi, WifiOff, Wind } from "lucide-react"
import type { GrowIconKey } from "@/lib/grow/presentation"

/**
 * MYKOSPHARE glyphs: a small shared visual language (24px grid, 1.6 stroke,
 * round caps/joins, organic curves). Lucide covers generic functions; these
 * cover concepts that belong to MYKOSPHARE only.
 */
type GlyphProps = SVGProps<SVGSVGElement> & { size?: number }

function Glyph({ size = 20, children, ...props }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  )
}

/** MYKO: cap, luminous body, three tendrils. Also the brand mark silhouette. */
export function GlyphMyko(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M4.2 11.2C4.2 7 7.6 4 12 4s7.8 3 7.8 7.2c0 .5-.4.8-.9.8H5.1c-.5 0-.9-.3-.9-.8Z" />
      <circle cx="12" cy="14" r="1.6" fill="currentColor" stroke="none" />
      <path d="M10.3 15.2c-.6 2.2-2 3.8-3.8 4.8M12 15.8V21M13.7 15.2c.6 2.2 2 3.8 3.8 4.8" />
    </Glyph>
  )
}

/** Mycelium: branching network with nodes. */
export function GlyphMycelium(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 20.5v-6.5M12 14c-2.2-1.4-3.4-3.4-3.8-6.2M12 14c2.2-1.4 3.4-3.4 3.8-6.2M8.2 7.8 5 5.6M8.2 7.8l.2-4M15.8 7.8 19 5.6M15.8 7.8l-.2-4M12 17.2l-3.6 1.6M12 17.2l3.6 1.6" />
      <circle cx="12" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </Glyph>
  )
}

/** Growth: a sprout unfolding from the substrate. */
export function GlyphGrowth(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 21v-7.5M12 13.5c0-4 2.6-6.6 7-6.8-.2 4.3-2.8 6.8-7 6.8ZM12 16c0-3.2-2.2-5.4-5.8-5.6.2 3.4 2.4 5.6 5.8 5.6Z" />
      <path d="M8.5 21h7" />
    </Glyph>
  )
}

/** Observation: a lens with a living iris ring. */
export function GlyphObserve(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M3.2 12c2.4-4.2 5.4-6.4 8.8-6.4s6.4 2.2 8.8 6.4c-2.4 4.2-5.4 6.4-8.8 6.4S5.6 16.2 3.2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
      <circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" />
    </Glyph>
  )
}

/** Memory: growth rings. */
export function GlyphMemory(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 6.6a5.4 5.4 0 1 1-5.2 6.8M12 3.4a8.6 8.6 0 1 1-8.3 10.8" />
    </Glyph>
  )
}

/** Biological event: a four-point spark. */
export function GlyphEvent(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3.5c.6 4 2.6 6 6.6 6.6-4 .6-6 2.6-6.6 6.6-.6-4-2.6-6-6.6-6.6 4-.6 6-2.6 6.6-6.6Z" />
      <path d="M18.5 16.5v3M17 18h3" />
    </Glyph>
  )
}

/** Sense / sensor: a node radiating perception. */
export function GlyphSense(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <path d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8M6 6a8.4 8.4 0 0 0 0 12M18 6a8.4 8.4 0 0 1 0 12" />
    </Glyph>
  )
}

/** Maps semantic icon keys to Lucide or MYKOSPHARE glyphs. Always decorative: pair with text. */
export function GrowIcon({ icon, size = 20, className }: { icon: GrowIconKey; size?: number; className?: string }) {
  const common = { size, className, "aria-hidden": true as const }
  switch (icon) {
    case "temperature": return <Thermometer {...common} strokeWidth={1.7} />
    case "humidity": return <Droplet {...common} strokeWidth={1.7} />
    case "air": return <Wind {...common} strokeWidth={1.7} />
    case "co2": return <Waves {...common} strokeWidth={1.7} />
    case "vision": return <Camera {...common} strokeWidth={1.7} />
    case "mass": return <Weight {...common} strokeWidth={1.7} />
    case "signal": return <Wifi {...common} strokeWidth={1.7} />
    case "signal-off": return <WifiOff {...common} strokeWidth={1.7} />
    case "check": return <Check {...common} strokeWidth={2} />
    case "attention": return <CircleAlert {...common} strokeWidth={1.7} />
    case "myko": return <GlyphMyko size={size} className={className} />
    case "mycelium": return <GlyphMycelium size={size} className={className} />
    case "growth": return <GlyphGrowth size={size} className={className} />
    case "observe": return <GlyphObserve size={size} className={className} />
    case "memory": return <GlyphMemory size={size} className={className} />
    case "event": return <GlyphEvent size={size} className={className} />
    case "sense": return <GlyphSense size={size} className={className} />
  }
}
