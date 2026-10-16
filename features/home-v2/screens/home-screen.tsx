"use client"

import { COPY } from "../copy"
import { CaptureCard } from "../components/home/capture-card"
import { ConnectCard } from "../components/home/connect-card"
import { CropHero } from "../components/home/crop-hero"
import { EnvironmentSummary } from "../components/home/environment-summary"
import { InsightCard } from "../components/home/insight-card"
import { StatusCard } from "../components/home/status-card"
import { Rise } from "../components/ui/surface"

/**
 * Inicio: the crop first (photograph as the protagonist), then the environment, the general
 * state, MYKO Insight and the primary action. Detail lives in Cultivo and Ambiente.
 */
export function HomeScreen() {
  return (
    <div className="hv2-stack">
      <h1 className="hv2-sr-only">{COPY.nav.home}</h1>
      <Rise i={0}><CropHero /></Rise>
      <Rise i={1}><EnvironmentSummary /></Rise>
      <Rise i={2}><StatusCard /></Rise>
      <Rise i={3}><InsightCard /></Rise>
      <Rise i={4}><CaptureCard /></Rise>
      <Rise i={5}><ConnectCard /></Rise>
    </div>
  )
}
