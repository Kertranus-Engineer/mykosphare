"use client"

import { COPY } from "../copy"
import { CaptureCard } from "../components/home/capture-card"
import { ConnectCard } from "../components/home/connect-card"
import { CropHero } from "../components/home/crop-hero"
import { EnvironmentSummary } from "../components/home/environment-summary"
import { InsightCard } from "../components/home/insight-card"
import { StatusCard } from "../components/home/status-card"
import { ControlCard } from "../components/mind/control-card"
import { MindRecommendations } from "../components/mind/mind-extras"
import { MindHero } from "../components/mind/mind-hero"
import { MykoChat } from "../components/mind/myko-chat"
import { Rise } from "../components/ui/surface"
import { useHomeV2 } from "../data/home-v2-provider"

/**
 * Inicio.
 * - Example view: the crop first, then what the person's own data will look like (unchanged).
 * - Real data: one answer first (MYKO Intelligence over the real readings), then only what needs attention,
 *   what MYKOSPHARE is doing, and a question box. Detail lives in Cultivo, Actividad and Ambiente.
 */
export function HomeScreen() {
  const { mode } = useHomeV2()
  if (mode !== "demo") {
    return (
      <div className="hv2-stack">
        <h1 className="hv2-sr-only">{COPY.nav.home}</h1>
        <Rise i={0}><MindHero /></Rise>
        <ConnectCard />
        <Rise i={1}><MindRecommendations /></Rise>
        <Rise i={2}><ControlCard /></Rise>
        <Rise i={3}><MykoChat /></Rise>
      </div>
    )
  }
  return (
    <div className="hv2-stack">
      <h1 className="hv2-sr-only">{COPY.nav.home}</h1>
      <Rise i={0}><CropHero /></Rise>
      <ConnectCard />
      <Rise i={1}><EnvironmentSummary /></Rise>
      <Rise i={2}><StatusCard /></Rise>
      <Rise i={3}><InsightCard /></Rise>
      <Rise i={4}><CaptureCard /></Rise>
    </div>
  )
}
