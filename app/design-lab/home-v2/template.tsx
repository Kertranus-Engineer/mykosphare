import type { ReactNode } from "react"

/**
 * A template re-mounts on every navigation inside the lab, which replays the
 * CSS page-enter animation (opacity + 8px rise, 240 ms). Disabled for
 * prefers-reduced-motion in the stylesheet.
 */
export default function HomeV2Template({ children }: { children: ReactNode }) {
  return <div className="hv2-page">{children}</div>
}
