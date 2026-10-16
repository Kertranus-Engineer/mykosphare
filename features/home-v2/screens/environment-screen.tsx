"use client"

import { COPY } from "../copy"
import { AlertsSection, MissingSensors } from "../components/ambiente/alerts-and-sensors"
import { DeviceDetails } from "../components/ambiente/device-sections"
import { TrendSection } from "../components/ambiente/trend-section"
import { EnvironmentSection } from "../components/home/environment-section"
import { Rise } from "../components/ui/surface"

/** Ambiente: readings, trend, active alerts, the ESP32 (sensors and actuators) and what is not measured. */
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
      <Rise i={4}><DeviceDetails /></Rise>
      <Rise i={5}><MissingSensors /></Rise>
    </div>
  )
}
