import { useId, type CSSProperties } from "react"
import type { MykoViewModel } from "@/lib/grow/types"
import { buildMykoGeometry, type MykoGeometry } from "./geometry"

/** Geometry is deterministic per (form, tense); compute each variant once. */
const cache = new Map<string, MykoGeometry>()
function geometryFor(model: MykoViewModel): MykoGeometry {
  const tense = model.mood === "distressed"
  const key = `${model.form}:${tense}`
  let geometry = cache.get(key)
  if (!geometry) {
    geometry = buildMykoGeometry(model.form, tense)
    cache.set(key, geometry)
  }
  return geometry
}

export interface SvgMykoProps {
  model: MykoViewModel
  label: string
  decorative?: boolean
  className?: string
}

/**
 * MYKO v0 renderer: SVG + CSS only (see grow.css `.myko`). It reads nothing but
 * the MykoViewModel. Mood and form are exposed as data attributes; all motion
 * is CSS transform/opacity and stops under prefers-reduced-motion.
 */
export function SvgMyko({ model, label, decorative = false, className }: SvgMykoProps) {
  const id = useId().replace(/:/g, "")
  const geometry = geometryFor(model)
  const core = `myko-core-${id}`
  const aura = `myko-aura-${id}`

  return (
    <svg
      viewBox="-100 -100 200 200"
      className={["myko", className].filter(Boolean).join(" ")}
      data-form={model.form}
      data-mood={model.mood}
      data-attention={model.attention}
      data-activity={model.activity}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      <defs>
        <radialGradient id={aura}>
          <stop offset="0%" style={{ stopColor: "var(--myko-glow)", stopOpacity: 0.34 }} />
          <stop offset="55%" style={{ stopColor: "var(--myko-glow)", stopOpacity: 0.08 }} />
          <stop offset="100%" style={{ stopColor: "var(--myko-glow)", stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={core} cx="42%" cy="38%" r="70%">
          <stop offset="0%" style={{ stopColor: "var(--myko-light)" }} />
          <stop offset="45%" style={{ stopColor: "var(--myko-core)" }} />
          <stop offset="100%" style={{ stopColor: "var(--myko-deep)" }} />
        </radialGradient>
      </defs>

      <circle className="myko-aura" r="96" fill={`url(#${aura})`} />

      <g className="myko-hyphae">
        {geometry.hyphae.map((hypha, index) => (
          <path key={index} d={hypha.d} strokeWidth={hypha.width} className="myko-hypha" />
        ))}
        {geometry.knots.map((knot, index) => (
          <circle key={index} cx={knot.x} cy={knot.y} r={knot.r} className="myko-knot" />
        ))}
      </g>

      {geometry.lamellae.length > 0 && (
        <g className={geometry.open ? "myko-lamellae myko-lamellae-open" : "myko-lamellae"}>
          {geometry.lamellae.map((d, index) => (
            <path key={index} d={d} />
          ))}
        </g>
      )}

      <g className="myko-body">
        <path className="myko-membrane" d={geometry.membranePath} />
        <circle className="myko-nucleus" r={geometry.nucleus} fill={`url(#${core})`} />
        {geometry.organelles.map((organelle, index) => (
          <circle key={index} className="myko-organelle" cx={organelle.x} cy={organelle.y} r={organelle.r} />
        ))}
      </g>

      <g className="myko-spores">
        {geometry.spores.map((spore, index) => (
          <circle
            key={index}
            cx={spore.x}
            cy={spore.y}
            r={spore.r}
            style={{ "--dx": `${spore.dx}px`, "--dy": `${spore.dy}px`, animationDelay: `${spore.delay}s`, animationDuration: `${spore.duration}s` } as CSSProperties}
          />
        ))}
      </g>
    </svg>
  )
}
