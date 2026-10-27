"use client"

import { ScanEye } from "lucide-react"

import { COPY } from "../copy"
import { CropHeader } from "../components/cultivo/crop-header"
import { Logbook } from "../components/cultivo/logbook"
import { PhotoGallery } from "../components/cultivo/photo-gallery"
import { StageTrack } from "../components/cultivo/stage-track"
import { CultivationPanel } from "../components/mind/cultivation-panel"
import { PlaceholderCard } from "../components/shared/placeholder-card"
import { Rise } from "../components/ui/surface"
import { useHomeV2 } from "../data/home-v2-provider"

/**
 * Cultivo: follow ONE crop (identity, photos, stages, logbook). Stages and
 * logbook only exist while there is a crop; photos show whatever the device
 * captured. Environment history lives in Actividad.
 * With real data the screen is where the crop is configured (species, stage, targets): fewer cards, no placeholders.
 */
export function CultivoScreen() {
  const { mode, intelligence } = useHomeV2()
  if (mode !== "demo") {
    return (
      <div className="hv2-stack">
        <Rise i={0}>
          <header className="hv2-page-head">
            <h1 className="hv2-page-title">{COPY.nav.crop}</h1>
            <p className="hv2-page-lead">Especie, etapa y rangos con los que evalúo tu ambiente.</p>
          </header>
        </Rise>
        <Rise i={1}><CultivationPanel /></Rise>
        {intelligence?.cultivation && <Rise i={2}><StageTrack /></Rise>}
        {intelligence?.cultivation && <Rise i={3}><Logbook /></Rise>}
      </div>
    )
  }
  return (
    <div className="hv2-stack">
      <Rise i={0}><CropHeader /></Rise>
      <Rise i={1}><PhotoGallery /></Rise>
      <Rise i={2}><StageTrack /></Rise>
      <Rise i={3}><Logbook /></Rise>
      <Rise i={4}>
        <PlaceholderCard
          headingId="hv2-visual-h"
          title={COPY.visual.title}
          badge={COPY.visual.badge}
          emptyLabel={COPY.visual.empty}
          body={COPY.visual.body}
          icon={<ScanEye className="size-5" />}
        />
      </Rise>
    </div>
  )
}
