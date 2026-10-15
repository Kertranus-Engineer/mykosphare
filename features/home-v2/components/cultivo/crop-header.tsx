"use client"

import { COPY } from "../../copy"
import { formatDate } from "../../data/format"
import { useHomeV2 } from "../../data/home-v2-provider"
import { CropHero } from "../home/crop-hero"
import { Chip, ProvenanceBadge } from "../ui/surface"

/** Crop identity for the Cultivo screen. Non-ready states reuse the shared hero states. */
export function CropHeader() {
  const { cultivation } = useHomeV2()
  if (cultivation.status !== "ready") {
    return (
      <>
        <h1 className="hv2-sr-only">{COPY.nav.crop}</h1>
        <CropHero />
      </>
    )
  }

  const { name, scientificName, provenance, stage, day, startedAt, sampleProfile } = cultivation
  return (
    <header className="hv2-crop-head" aria-labelledby="hv2-crop-title">
      <div className="hv2-crop-head-top">
        <p className="hv2-kicker">{COPY.crop.kicker}</p>
        <ProvenanceBadge provenance={provenance} />
      </div>
      <h1 id="hv2-crop-title" className="hv2-crop-title">{name}</h1>
      <p className="hv2-crop-species">{scientificName}</p>

      <dl className="hv2-facts">
        <div className="hv2-fact">
          <dt>Etapa</dt>
          <dd>{stage.label}</dd>
        </div>
        <div className="hv2-fact">
          <dt>Día</dt>
          <dd>{day ?? "—"}</dd>
        </div>
        <div className="hv2-fact">
          <dt>Inicio</dt>
          <dd><time dateTime={startedAt}>{formatDate(startedAt)}</time></dd>
        </div>
      </dl>

      {sampleProfile && (
        <p className="hv2-crop-note">
          <Chip tone="info">{COPY.crop.sampleProfile}</Chip>
          {COPY.crop.sampleProfileBody}
        </p>
      )}
    </header>
  )
}
