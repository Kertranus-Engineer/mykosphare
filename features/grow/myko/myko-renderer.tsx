import { describeMyko } from "@/lib/grow/presentation"
import type { MykoViewModel } from "@/lib/grow/types"
import { SvgMyko } from "./svg-myko"

/**
 * Stable MYKO contract for pages. Renderers receive ONLY the MykoViewModel —
 * never telemetry, thresholds or GrowState. Swapping SvgMyko for a future
 * RiveMyko happens here, without touching GrowState or any page.
 */
export interface MykoRendererProps {
  model: MykoViewModel
  /** True when an adjacent text already states MYKO's status. */
  decorative?: boolean
  className?: string
}

export function MykoRenderer({ model, decorative, className }: MykoRendererProps) {
  return <SvgMyko model={model} label={describeMyko(model)} decorative={decorative} className={className} />
}
