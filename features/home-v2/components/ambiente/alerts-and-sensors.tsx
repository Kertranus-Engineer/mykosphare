"use client"

import { CircleCheck, Wind, Zap } from "lucide-react"

import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { Card, EmptyState, SectionHeading, ToneDot } from "../ui/surface"

/** Alerts the shared environment engine reports as active right now. */
export function AlertsSection() {
  const { history, environment } = useHomeV2()
  // While the first reading is still arriving, engine alerts would only describe "no data yet".
  const loading = environment.status === "waiting" && environment.reason === "loading"
  const alerts = loading ? [] : history.filter((entry) => entry.kind === "alert" && entry.at === null)
  const ready = environment.status === "ready"

  return (
    <section aria-labelledby="hv2-alerts-h" className="hv2-block">
      <SectionHeading id="hv2-alerts-h" title={COPY.environmentPage.alertsTitle} />
      <Card className="hv2-alerts-card">
        {alerts.length > 0 ? (
          <ul className="hv2-notice-list">
            {alerts.map((alert) => (
              <li key={alert.id} className="hv2-notice" data-tone={alert.tone}>
                <ToneDot tone={alert.tone} />
                <div className="hv2-notice-text">
                  <p className="hv2-notice-title">{alert.title}</p>
                  {alert.detail && <p className="hv2-notice-detail">{alert.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        ) : ready ? (
          <EmptyState compact icon={<CircleCheck className="size-5" />} title={COPY.environmentPage.noAlerts} body={COPY.environmentPage.noAlertsBody} />
        ) : (
          <EmptyState compact icon={<CircleCheck className="size-5" />} title={COPY.environmentPage.alertsUnknown} />
        )}
      </Card>
    </section>
  )
}

/** Honest list of what is NOT measured, instead of invented values. */
export function MissingSensors() {
  const rows = [
    { id: "co2", icon: Wind, label: COPY.environmentPage.co2, body: COPY.environmentPage.co2Body },
    { id: "energy", icon: Zap, label: COPY.environmentPage.energy, body: COPY.environmentPage.energyBody },
  ]
  return (
    <section aria-labelledby="hv2-missing-h" className="hv2-block">
      <SectionHeading id="hv2-missing-h" title={COPY.environmentPage.missingTitle} />
      <Card className="hv2-missing">
        <ul className="hv2-missing-list">
          {rows.map(({ id, icon: Icon, label, body }) => (
            <li key={id} className="hv2-missing-row">
              <span className="hv2-missing-icon" aria-hidden><Icon className="size-[18px]" /></span>
              <div className="hv2-missing-text">
                <p className="hv2-missing-label">{label} <span className="hv2-missing-state">· {COPY.environmentPage.unavailable}</span></p>
                <p className="hv2-caption">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
