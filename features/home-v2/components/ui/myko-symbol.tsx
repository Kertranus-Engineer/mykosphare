import { useId } from "react"

/**
 * MYKO Insight symbol: a luminous spore core with two orbiting rings and three
 * hyphae ending in nodes. Static (it draws in once via CSS), no character and no
 * animation loop. Colours come from the theme tokens through currentColor / CSS.
 */
export function MykoSymbol({ className, dim = false }: { className?: string; dim?: boolean }) {
  const id = useId()
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={className} data-dim={dim || undefined}>
      <defs>
        <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="var(--hv2-accent)" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="var(--hv2-accent)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--hv2-accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--hv2-accent)" />
          <stop offset="1" stopColor="var(--hv2-accent-2)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${id}-core)`} opacity={dim ? 0.35 : 0.7} />
      <ellipse cx="32" cy="32" rx="25" ry="9.5" transform="rotate(-24 32 32)" stroke={`url(#${id}-ring)`} strokeWidth="1.4" opacity={dim ? 0.4 : 0.9} className="hv2-myko-ring" />
      <ellipse cx="32" cy="32" rx="25" ry="9.5" transform="rotate(48 32 32)" stroke={`url(#${id}-ring)`} strokeWidth="1" opacity={dim ? 0.25 : 0.55} className="hv2-myko-ring" />
      <g stroke="var(--hv2-accent)" strokeWidth="1.5" strokeLinecap="round" opacity={dim ? 0.45 : 1}>
        <path d="M32 27V15.5" className="hv2-myko-hypha" />
        <path d="M35.6 35.4l9.6 6.2" className="hv2-myko-hypha" />
        <path d="M28.4 35.4l-9.6 6.2" className="hv2-myko-hypha" />
      </g>
      <g fill="var(--hv2-accent-2)" opacity={dim ? 0.45 : 1}>
        <circle cx="32" cy="14" r="2.4" className="hv2-myko-node" />
        <circle cx="46.2" cy="42.4" r="2.4" className="hv2-myko-node" />
        <circle cx="17.8" cy="42.4" r="2.4" className="hv2-myko-node" />
      </g>
      <circle cx="32" cy="32" r="5" fill="var(--hv2-accent)" opacity={dim ? 0.55 : 1} />
      <circle cx="30.4" cy="30.4" r="1.6" fill="#fff" opacity={dim ? 0.2 : 0.6} />
    </svg>
  )
}
