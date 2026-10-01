import { useId, type CSSProperties } from "react"
import type { GrowDomain, GrowSenseKey, MykoLiveActivity } from "@/lib/grow/presentation"
import type { MykoViewModel } from "@/lib/grow/types"
import { buildMykoGeometry, MYKO_VIEWBOX, type Point } from "./geometry"
import { NEUTRAL_MYKO_TRAITS, type MykoVisualTraits } from "./traits"
import { mykoMoodVisual } from "./visual-config"

/** A sense organ grown from the body. Only pass senses that physically exist. */
export interface MykoSenseMark {
  key: GrowSenseKey
  state: "active" | "quiet"
  domain: GrowDomain
  /** The environment this sense perceives needs attention: the organ carries the need colour. */
  alert?: "attention" | "critical" | null
}

/** Evolution ceremony phases (Visual Lab only for now). */
export type MykoMomentPhase = "charge" | "emerge"

export interface SvgMykoProps {
  model: MykoViewModel
  label: string
  decorative?: boolean
  className?: string
  traits?: MykoVisualTraits
  activity?: MykoLiveActivity
  senses?: readonly MykoSenseMark[]
  /** Increment to replay the one-shot touch reaction (cosmetic only). */
  reaction?: number
  moment?: MykoMomentPhase | null
  /** Static rendering (thumbnails, form track, signature tests): no motion. */
  still?: boolean
}

/**
 * transform-origin for a point in user space. With `transform-box: view-box`
 * the reference box sits at the user-space ORIGIN (0,0), not at the viewBox
 * corner, so coordinates are used as-is.
 */
const origin = (p: Point): CSSProperties => ({ transformOrigin: `${Math.round(p.x * 10) / 10}px ${Math.round(p.y * 10) / 10}px` })

const BURST = [
  { dx: -24, dy: -30 }, { dx: 22, dy: -34 }, { dx: -36, dy: -4 },
  { dx: 34, dy: -8 }, { dx: -10, dy: -42 }, { dx: 12, dy: -44 },
]

/**
 * MYKO renderer: layered SVG + CSS (grow.css `.myko`). FORM + TRAITS select
 * anatomy around the SIGNATURE (nucleus suspended in an open C membrane,
 * joined to the network by a vein); MOOD selects posture/rhythm/aura/light
 * (CSS only); ACTIVITY plays one-shot behaviours. Motion is transform/opacity
 * (plus short dash pulses along routes) and stops under reduced motion/`still`.
 */
export function SvgMyko({
  model,
  label,
  decorative = false,
  className,
  traits = NEUTRAL_MYKO_TRAITS,
  activity = "idle",
  senses = [],
  reaction = 0,
  moment = null,
  still = false,
}: SvgMykoProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  const mood = mykoMoodVisual(model.mood)
  const g = buildMykoGeometry(model.form, traits)
  const live: MykoLiveActivity = model.mood === "uncertain" && activity !== "touched" ? "waiting" : activity
  const ids = {
    aura: `mk-aura-${id}`,
    hood: `mk-hood-${id}`,
    hoodInner: `mk-hoodi-${id}`,
    core: `mk-core-${id}`,
    membrane: `mk-mem-${id}`,
    glow: `mk-glow-${id}`,
  }
  const vb = `${MYKO_VIEWBOX.minX} ${MYKO_VIEWBOX.minY} ${MYKO_VIEWBOX.width} ${MYKO_VIEWBOX.height}`
  const touched = reaction > 0 || live === "touched"

  return (
    <svg
      viewBox={vb}
      className={["myko", className].filter(Boolean).join(" ")}
      data-form={model.form}
      data-mood={model.mood}
      data-posture={mood.posture}
      data-halo={mood.halo}
      data-rhythm={mood.rhythm}
      data-attention={model.attention}
      data-live={live}
      data-moment={moment ?? undefined}
      data-still={still ? "true" : undefined}
      style={{ "--myko-breath": `${mood.breath}s`, "--myko-light": mood.light, "--myko-side": g.side } as CSSProperties}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      <defs>
        <radialGradient id={ids.aura} cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: "var(--myko-aura-a)", stopOpacity: 0.34 }} />
          <stop offset="50%" style={{ stopColor: "var(--myko-aura-b)", stopOpacity: 0.1 }} />
          <stop offset="100%" style={{ stopColor: "var(--myko-aura-b)", stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={ids.hood} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--myko-hood-top)", stopOpacity: 0.95 }} />
          <stop offset="62%" style={{ stopColor: "var(--myko-hood-mid)", stopOpacity: 0.74 }} />
          <stop offset="100%" style={{ stopColor: "var(--myko-hood-rim)", stopOpacity: 0.86 }} />
        </linearGradient>
        <linearGradient id={ids.hoodInner} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--myko-hood-glow)", stopOpacity: 0.5 }} />
          <stop offset="100%" style={{ stopColor: "var(--myko-hood-glow)", stopOpacity: 0 }} />
        </linearGradient>
        <radialGradient id={ids.core} cx="40%" cy="38%" r="70%">
          <stop offset="0%" style={{ stopColor: "var(--myko-core-hot)" }} />
          <stop offset="34%" style={{ stopColor: "var(--myko-core)" }} />
          <stop offset="100%" style={{ stopColor: "var(--myko-core-deep)", stopOpacity: 0.9 }} />
        </radialGradient>
        <linearGradient id={ids.membrane} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--myko-membrane-a)", stopOpacity: 0.86 }} />
          <stop offset="100%" style={{ stopColor: "var(--myko-membrane-b)", stopOpacity: 0.62 }} />
        </linearGradient>
        <radialGradient id={ids.glow}>
          <stop offset="0%" style={{ stopColor: "var(--myko-core)", stopOpacity: 0.5 }} />
          <stop offset="100%" style={{ stopColor: "var(--myko-core)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      <ellipse className="myko-aura" cx={g.aura.cx} cy={g.aura.cy} rx={g.aura.rx} ry={g.aura.ry} fill={`url(#${ids.aura})`} />
      <ellipse className="myko-substrate" cx="0" cy={g.ground + 12} rx="100" ry="16" />

      <g
        key={`o-${reaction}-${moment ?? "none"}-${live}`}
        className={touched ? "myko-organism myko-react" : "myko-organism"}
        style={origin(g.pivots.core)}
      >
        {/* Distributed body: the mycelial network */}
        <g className="myko-net" style={origin(g.pivots.net)}>
          <path className="myko-h myko-h-links" d={g.hyphae.links} strokeWidth={g.hyphae.widths.links} />
          <path className="myko-h myko-h-fine" d={g.hyphae.fine} strokeWidth={g.hyphae.widths.fine} />
          <path className="myko-h myko-h-mid" d={g.hyphae.mid} strokeWidth={g.hyphae.widths.mid} />
          <path className="myko-h myko-h-thick" d={g.hyphae.thick} strokeWidth={g.hyphae.widths.thick} />
          {g.satellites.map((sat, i) => <path key={`r${i}`} className="myko-route" d={sat.route} />)}
          {g.nodes.map((n, i) => (
            <circle key={`n${i}`} className="myko-node" cx={n.x} cy={n.y} r={n.r} data-lit={i % 3 === 0 ? "true" : undefined} style={{ "--o": n.order } as CSSProperties} />
          ))}
          {g.tips.map((t, i) => <circle key={`t${i}`} className="myko-tip" cx={t.x} cy={t.y} r={t.r} style={{ animationDelay: `${(i * 1.3) % 6}s` }} />)}
          {g.pins.map((p, i) => <circle key={`p${i}`} className="myko-pin" cx={p.x} cy={p.y} r={p.r} />)}
        </g>

        {g.satellites.map((sat, i) => (
          <g key={`s${i}`} className="myko-satellite" style={origin(sat.core)}>
            <path className="myko-membrane" d={sat.membrane} fill={`url(#${ids.membrane})`} />
            <circle className="myko-satellite-core" cx={sat.core.x} cy={sat.core.y} r={sat.core.r} fill={`url(#${ids.core})`} />
          </g>
        ))}

        {/* Body: spine + the signature C membrane + vein */}
        <g className="myko-body" style={origin(g.pivots.body)}>
          {g.bodies.map((d, i) => <path key={i} className="myko-spine" d={d} fill={`url(#${ids.membrane})`} />)}
          <path className="myko-membrane myko-signature" d={g.signature.membrane} fill={`url(#${ids.membrane})`} />
          <path className="myko-vein" d={g.vein} />
        </g>

        {/* Energy travelling nucleus → vein → network (idle: rare; sensing: now) */}
        <g className="myko-pulses" aria-hidden="true">
          {g.routes.map((d, i) => <path key={i} className="myko-pulse" d={d} pathLength={100} style={{ "--i": i } as CSSProperties} />)}
        </g>

        {/* The nucleus: the same being through the whole cultivation */}
        <g className="myko-nucleus" style={origin(g.pivots.core)}>
          <circle className="myko-core-glow-under" cx={g.core.x} cy={g.core.y} r={g.core.r * 2.2} fill={`url(#${ids.glow})`} />
          <path className="myko-core" d={g.nucleus.body} fill={`url(#${ids.core})`} />
          <circle className="myko-yolk" cx={g.nucleus.yolk.x} cy={g.nucleus.yolk.y} r={g.nucleus.yolk.r} />
          <path className="myko-organelles" d={g.nucleus.organelles} />
          <path className="myko-orbit" d={g.nucleus.orbit} style={origin(g.pivots.core)} />
        </g>

        {g.caps.length > 0 && (
          <g className="myko-top" style={origin(g.pivots.top)}>
            {g.caps.map((cap, i) => (
              <g key={i} className="myko-cap" data-role={cap.role}>
                <path d={cap.outer} fill={`url(#${ids.hood})`} className="myko-cap-outer" />
                <path d={cap.inner} fill={`url(#${ids.hoodInner})`} />
                <path className="myko-gills" d={cap.gills} />
                {cap.veins && <path className="myko-cap-veins" d={cap.veins} />}
                <path className="myko-cap-highlight" d={cap.highlight} />
                <path className="myko-cap-spots" d={cap.spots} />
                <g className="myko-rim">
                  {cap.rim.map((r, j) => <circle key={j} cx={r.x} cy={r.y} r={r.r} />)}
                </g>
              </g>
            ))}
          </g>
        )}

        <circle className="myko-core-glow" cx={g.core.x} cy={g.core.y} r={g.core.r * 2.6} fill={`url(#${ids.glow})`} style={origin(g.core)} />

        {senses.length > 0 && (
          <g className="myko-senses">
            {senses.map((sense) => {
              const anchor = g.senseAnchors[sense.key]
              return (
                <g key={sense.key} className="myko-sense" data-sense={sense.key} data-state={sense.state} data-domain={sense.alert ?? sense.domain} data-alert={sense.alert ?? undefined}>
                  <path className="myko-sense-stem" d={`M${anchor.from.x} ${anchor.from.y}L${anchor.at.x} ${anchor.at.y}`} />
                  <circle className="myko-sense-halo" cx={anchor.at.x} cy={anchor.at.y} r={7.5} style={origin(anchor.at)} />
                  <circle className="myko-sense-ring" cx={anchor.at.x} cy={anchor.at.y} r={4.6} />
                  <circle className="myko-sense-dot" cx={anchor.at.x} cy={anchor.at.y} r={2.5} />
                </g>
              )
            })}
          </g>
        )}

        {(touched || moment === "emerge") && (
          <circle className="myko-ring" cx={g.core.x} cy={g.core.y} r={g.core.r * 1.6} style={origin(g.core)} />
        )}
      </g>

      {mood.spores && g.spores.length > 0 && (
        <g className="myko-spores">
          {g.spores.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` } as CSSProperties}
            />
          ))}
        </g>
      )}

      {(touched || moment === "emerge") && (
        <g key={`burst-${reaction}-${moment ?? ""}`} className="myko-burst">
          {BURST.map((b, i) => (
            <circle key={i} cx={g.core.x} cy={g.core.y} r={1.6} style={{ "--dx": `${b.dx}px`, "--dy": `${b.dy}px`, animationDelay: `${i * 40}ms` } as CSSProperties} />
          ))}
        </g>
      )}
    </svg>
  )
}
