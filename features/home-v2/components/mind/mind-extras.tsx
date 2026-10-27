"use client"

import { withUnit, rangeText } from "@/lib/grow/intelligence"
import { useHomeV2 } from "../../data/home-v2-provider"
import { SEVERITY_TONE } from "../../data/intelligence-view"
import { Card, Chip, SectionHeading } from "../ui/surface"

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })

/**
 * What MYKOSPHARE noticed and why, in plain words. Each item names the measurement that caused it and who decides
 * (a suggestion for you, or something that would need your confirmation). Hidden when nothing needs attention.
 */
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
            <Chip tone="muted" className="hv2-reco-decision">{rec.decision.label}</Chip>
            <p className="hv2-reco-note">{rec.decision.reason}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

/** The last 24 h in numbers, from the measurements alone (works with no crop registered). */
export function TelemetrySummary() {
  const { intelligence } = useHomeV2()
  const t = intelligence?.context.telemetry
  if (!t || t.window.samples < 6) return null
  const range = (metric: "temperature" | "humidity") => {
    const r = t.range24h[metric]
    return r ? `${withUnit(metric, r.min)} – ${withUnit(metric, r.max)}` : "—"
  }
  return (
    <Card className="hv2-tele" aria-label="Últimas 24 horas">
      <h2 className="hv2-tele-title">Últimas 24 horas</h2>
      <dl className="hv2-setup-facts">
        <div><dt>Temperatura</dt><dd>{range("temperature")}</dd></div>
        <div><dt>Humedad</dt><dd>{range("humidity")}</dd></div>
        <div><dt>Mediciones recibidas</dt><dd>{t.coverage.pct} %</dd></div>
        <div><dt>Estabilidad</dt><dd>{t.stability.temperature === "unknown" ? "Reuniendo datos" : t.stability.temperature === "stable" && t.stability.humidity !== "variable" ? "Estable" : "Con variaciones"}</dd></div>
      </dl>
      {t.insights.length > 0 && <ul className="hv2-tele-list">{t.insights.slice(0, 3).map(i => <li key={i.id}>{i.text}</li>)}</ul>}
    </Card>
  )
}
