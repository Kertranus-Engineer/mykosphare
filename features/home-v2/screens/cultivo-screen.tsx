"use client"

import { ScanEye } from "lucide-react"

import { COPY } from "../copy"
import { CropHeader } from "../components/cultivo/crop-header"
import { Logbook } from "../components/cultivo/logbook"
import { PhotoGallery } from "../components/cultivo/photo-gallery"
import { StageTrack } from "../components/cultivo/stage-track"
import { PlaceholderCard } from "../components/shared/placeholder-card"
import { Rise } from "../components/ui/surface"

/**
 * Cultivo: follow ONE crop (identity, photos, stages, logbook). Stages and
 * logbook only exist while there is a crop; photos show whatever the device
 * captured. Environment history lives in Historial.
 */
export function CultivoScreen() {
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
