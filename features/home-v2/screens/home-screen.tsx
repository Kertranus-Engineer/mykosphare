"use client"

import { Camera } from "lucide-react"

import { COPY } from "../copy"
import { CropHero } from "../components/home/crop-hero"
import { DeviceRow } from "../components/home/device-row"
import { EnvironmentSummary } from "../components/home/environment-summary"
import { PlaceholderCard } from "../components/shared/placeholder-card"
import { Card, Rise } from "../components/ui/surface"

/**
 * Inicio: the crop first, then a compact environment summary and device line.
 * Detail lives in Cultivo and Ambiente; nothing here repeats it.
 */
export function HomeScreen() {
  return (
    <div className="hv2-stack">
      <h1 className="hv2-sr-only">{COPY.nav.home}</h1>
      <Rise i={0}><CropHero /></Rise>
      <Rise i={1}><EnvironmentSummary /></Rise>
      <Rise i={2}><DeviceRow /></Rise>
      <Rise i={3}>
        <PlaceholderCard
          headingId="hv2-insight-h"
          title={COPY.insight.title}
          badge={COPY.insight.badge}
          emptyLabel={COPY.insight.empty}
          body={COPY.insight.body}
        />
      </Rise>
      {/* No photo-registration function exists yet: an informative note, not a button that pretends to work. */}
      <Rise i={4}>
        <Card className="hv2-note">
          <span aria-hidden className="hv2-note-icon"><Camera className="size-[18px]" /></span>
          <div>
            <p className="hv2-note-title">{COPY.home.photoInfoTitle}</p>
            <p className="hv2-caption">{COPY.home.photoInfoBody}</p>
          </div>
        </Card>
      </Rise>
    </div>
  )
}
