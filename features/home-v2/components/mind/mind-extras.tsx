"use client"

import { withUnit, rangeText } from "@/lib/grow/intelligence"
import { useHomeV2 } from "../../data/home-v2-provider"
import { SEVERITY_TONE } from "../../data/intelligence-view"
import { Card, SectionHeading } from "../ui/surface"

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })

/** What MYKOSPHARE noticed and why, in plain words. Each item names the measurement that caused it. Hidden when nothing needs attention. */
export function MindRecommendations() {
  const { intelligence } = useHomeV2()
  const items = (intelligence?.report.recommendations ?? []).filter(r => r.findingKind !== "needs_configuration" && r.findingKind !== "insufficient_data" && r.severity !== "info")
  if (items.length === 0) return null
  return (
    <section aria-labelledby="hv2-reco-h" className="hv2-block">
      <SectionHeading id="hv2-reco-h" title="Necesita atención" />
      <div className="hv2-reco-list">
        {items.slice(0, 2).map(rec => (
          <Card key={rec.id} className="hv2-reco" tone={SEVERITY_TONE[rec.severity]}>
            <h3 className="hv2-reco-title">{rec.title}</h3>
            <p className="hv2-reco-body">{rec.body}</p>
            <p className="hv2-reco-why">
              Basado en {rec.cause.metric && rec.cause.value != null ? withUnit(rec.cause.metric, rec.cause.value) : "tus mediciones"}
              {rec.cause.target && rec.cause.metric ? ` · objetivo ${rangeText(rec.cause.metric, rec.cause.target)}` : ""}
              {rec.cause.since ? ` · desde las ${hhmm(rec.cause.since)}` : ""}
            </p>
          </Card>
        ))}
      </div>
    </section>
  )
}
