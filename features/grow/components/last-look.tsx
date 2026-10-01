import type { PresentedLook } from "@/lib/grow/presentation"
import { GlyphObserve } from "../glyphs/grow-glyphs"
import { LocalTime } from "./local-time"

/** "Última mirada": only a real (or explicitly labelled simulated) capture; otherwise an honest empty state. */
export function LastLook({ look, now }: { look: PresentedLook; now: string }) {
  if (look.kind === "empty") {
    return (
      <p className="g-look-empty" style={{ margin: 0 }}>
        <GlyphObserve size={22} />
        {look.body}
      </p>
    )
  }
  return (
    <figure style={{ margin: 0, display: "grid", gap: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- captures come from Storage URLs */}
      <img src={look.imageUrl} alt={look.title} style={{ width: "100%", borderRadius: 22 }} />
      <figcaption className="g-muted" style={{ fontSize: "0.8rem" }}>
        <LocalTime iso={look.at} now={now} />
        {look.simulatedLabel && ` · ${look.simulatedLabel}`}
      </figcaption>
    </figure>
  )
}
