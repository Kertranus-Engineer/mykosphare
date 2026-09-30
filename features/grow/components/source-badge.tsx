import type { PresentedSource } from "@/lib/grow/presentation"

/** Provenance only (REAL / SIMULACIÓN). Connection health is a separate component. */
export function SourceBadge({ source }: { source: PresentedSource }) {
  return (
    <span className="g-source" data-source={source.kind} title={source.description} aria-label={`${source.label}. ${source.description}`}>
      <span className={source.kind === "real" ? "g-source-mark-real" : "g-source-mark-sim"} aria-hidden="true" />
      {source.label}
    </span>
  )
}
