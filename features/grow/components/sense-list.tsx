import type { PresentedSense } from "@/lib/grow/presentation"
import { GrowIcon } from "../glyphs/grow-glyphs"
import { ToneMark } from "./tone-mark"

/** MYKO's senses. Installed senses show state and value; others are capabilities (no value, ever). */
export function SenseList({ senses }: { senses: PresentedSense[] }) {
  return (
    <ul className="g-senses">
      {senses.map((sense) => (
        <li key={sense.key} className="g-sense" data-state={sense.state}>
          <span className="g-sense-head">
            <span data-domain={sense.state === "not_installed" ? "neutral" : sense.domain}>
              <GrowIcon icon={sense.icon} size={18} />
            </span>
            {sense.name}
          </span>
          <span className="g-sense-state">
            <ToneMark tone={sense.state === "connected" ? sense.tone : "unknown"} />
            {sense.modeLabel} · {sense.stateLabel}
          </span>
          {sense.value !== null && <span className="g-sense-value">{sense.value}</span>}
          {sense.conditionLabel && <span className="g-sense-state">{sense.conditionLabel}</span>}
          {sense.future && <span className="g-sense-future">{sense.future}</span>}
        </li>
      ))}
    </ul>
  )
}
