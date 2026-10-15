"use client"

import { COPY } from "../copy"
import { CaptureAction } from "../components/home/capture-action"
import { CropHero } from "../components/home/crop-hero"
import { DeviceCard } from "../components/home/device-card"
import { EnvironmentSection } from "../components/home/environment-section"
import { PlaceholderCard } from "../components/shared/placeholder-card"
import { Rise } from "../components/ui/surface"

/** Inicio V2: crop first, then the environment, the device and what is coming. */
export function HomeScreen() {
  return (
    <div className="hv2-stack">
      <h1 className="hv2-sr-only">{COPY.nav.home}</h1>
      <Rise i={0}><CropHero /></Rise>
      <Rise i={1}><EnvironmentSection /></Rise>
      <Rise i={2}><DeviceCard /></Rise>
      <Rise i={3}>
        <PlaceholderCard
          headingId="hv2-insight-h"
          title={COPY.insight.title}
          badge={COPY.insight.badge}
          emptyLabel={COPY.insight.empty}
          body={COPY.insight.body}
        />
      </Rise>
      <Rise i={4}><CaptureAction /></Rise>
    </div>
  )
}
