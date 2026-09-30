import type { GrowTone } from "@/lib/grow/presentation"

/** Shape + colour marker; decorative because adjacent text carries the meaning. */
export function ToneMark({ tone }: { tone: GrowTone }) {
  return <span className="g-tone" data-tone={tone} aria-hidden="true" />
}
