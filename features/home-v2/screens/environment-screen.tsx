"use client"

import { COPY } from "../copy"
import { AlertsSection, MissingSensors } from "../components/ambiente/alerts-and-sensors"
import { TrendSection } from "../components/ambiente/trend-section"
import { DeviceCard } from "../components/home/device-card"
import { EnvironmentSection } from "../components/home/environment-section"
import { Rise } from "../components/ui/surface"

/** Ambiente V2: what the device reports now, its session trend, active alerts and what is missing. */
export function EnvironmentScreen() {
  return (
    <div className="hv2-stack">
      <Rise i={0}>
        <header className="hv2-page-head">
          <h1 className="hv2-page-title">{COPY.environmentPage.title}</h1>
          <p className="hv2-page-lead">{COPY.environmentPage.lead}</p>
        </header>
      </Rise>
      <Rise i={1}><EnvironmentSection title={COPY.environmentPage.readings} showSpark={false} /></Rise>
      <Rise i={2}><TrendSection /></Rise>
      <Rise i={3}><AlertsSection /></Rise>
      <Rise i={4}><DeviceCard /></Rise>
      <Rise i={5}><MissingSensors /></Rise>
    </div>
  )
}
