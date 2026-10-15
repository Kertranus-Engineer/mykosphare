import { cn } from "@/lib/utils"

interface Segment {
  d: string
  depth: number
  delay: number
}

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

/** Deterministic branching network, generated once at module load (no render-time randomness). */
function buildNetwork(): { segments: Segment[]; nodes: { x: number; y: number; delay: number }[] } {
  const rand = mulberry32(2026)
  const segments: Segment[] = []
  const nodes: { x: number; y: number; delay: number }[] = []

  function branch(x: number, y: number, angle: number, length: number, depth: number, delay: number) {
    if (depth > 4 || length < 14) return
    const bend = (rand() - 0.5) * 0.9
    const x2 = x + Math.cos(angle + bend) * length
    const y2 = y + Math.sin(angle + bend) * length
    const cx = x + Math.cos(angle) * length * 0.55
    const cy = y + Math.sin(angle) * length * 0.55
    segments.push({ d: `M${x.toFixed(1)} ${y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, depth, delay })
    if (depth >= 2 && rand() > 0.5) nodes.push({ x: x2, y: y2, delay: delay + 0.5 })
    const children = depth < 2 ? 2 : rand() > 0.35 ? 2 : 1
    for (let i = 0; i < children; i++) {
      const spread = (i - (children - 1) / 2) * (0.7 + rand() * 0.5)
      branch(x2, y2, angle + spread, length * (0.62 + rand() * 0.18), depth + 1, delay + 0.18)
    }
  }

  const roots = 7
  for (let i = 0; i < roots; i++) {
    const angle = -Math.PI / 2 + (i / (roots - 1) - 0.5) * Math.PI * 1.55
    branch(200, 200, angle, 62 + rand() * 24, 0, i * 0.06)
  }
  return { segments, nodes }
}

const NETWORK = buildNetwork()

/**
 * Decorative mycelium drawn in once on mount (CSS stroke-dashoffset), then static.
 * It is an illustration: it never represents a measurement or a photograph.
 */
export function MyceliumArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" aria-hidden className={cn("hv2-mycelium", className)} preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        {NETWORK.segments.map((segment, index) => (
          <path
            key={index}
            d={segment.d}
            pathLength={1}
            strokeWidth={Math.max(0.6, 2.2 - segment.depth * 0.45)}
            strokeOpacity={Math.max(0.25, 0.85 - segment.depth * 0.15)}
            className="hv2-mycelium-path"
            style={{ animationDelay: `${segment.delay.toFixed(2)}s` }}
          />
        ))}
      </g>
      <g fill="currentColor">
        {NETWORK.nodes.map((node, index) => (
          <circle key={index} cx={node.x} cy={node.y} r={2.4} className="hv2-mycelium-node" style={{ animationDelay: `${node.delay.toFixed(2)}s` }} />
        ))}
        <circle cx={200} cy={200} r={5} className="hv2-mycelium-node" />
      </g>
    </svg>
  )
}
