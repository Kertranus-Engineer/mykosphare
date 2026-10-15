"use client"

import Link from "next/link"
import { ChevronRight, FlaskConical, ImageOff, Sprout, TriangleAlert } from "lucide-react"
import { useState } from "react"

import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { labHref, LAB_ROUTES } from "../../data/lab-request"
import type { PhotoModel } from "../../data/model"
import { useFeedback } from "../feedback"
import { MyceliumArt } from "../ui/mycelium-art"
import { Chip, ProvenanceBadge, Skeleton } from "../ui/surface"

/** Real photo when there is one; otherwise the decorative mycelium (never a fake photo). */
function HeroMedia({ photo }: { photo: PhotoModel | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (photo && failedUrl !== photo.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URL / data URI, no image loader configured
      <img src={photo.url} alt="" className="hv2-hero-img" decoding="async" onError={() => setFailedUrl(photo.url)} />
    )
  }
  return (
    <div aria-hidden className="hv2-hero-art">
      {photo && <ImageOff className="hv2-hero-art-fail size-5" />}
      <MyceliumArt />
    </div>
  )
}

/** First-crop presentation: what the crop view will show, and an honest note that creating crops is not available yet. */
function EmptyHero() {
  const { setDemo } = useHomeV2()
  const { notify } = useFeedback()
  return (
    <section className="hv2-hero hv2-hero--state" aria-labelledby="hv2-crop-state">
      <HeroMedia photo={null} />
      <div className="hv2-hero-scrim" />
      <div className="hv2-hero-body">
        <span className="hv2-hero-state-icon" aria-hidden><Sprout className="size-6" /></span>
        <h2 id="hv2-crop-state" className="hv2-hero-title hv2-hero-title--state">{COPY.crop.emptyTitle}</h2>
        <p className="hv2-hero-lead">{COPY.crop.emptyBody}</p>
        <ol className="hv2-hero-steps">
          {COPY.crop.steps.map((step, index) => (
            <li key={step}>
              <span aria-hidden className="hv2-hero-step-n">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <p className="hv2-hero-note">{COPY.crop.emptyNote}</p>
        <div className="hv2-hero-actions">
          <button
            type="button"
            className="hv2-button hv2-button--glass hv2-press"
            onClick={() => {
              setDemo({ enabled: true })
              notify({ message: COPY.morePage.enabledToast })
            }}
          >
            <FlaskConical aria-hidden className="size-4" />
            {COPY.crop.tryDemo}
          </button>
        </div>
      </div>
    </section>
  )
}

export function CropHero() {
  const { cultivation, photos, request, retryCultivation } = useHomeV2()
  const latest = photos.status === "ready" ? photos.items[photos.items.length - 1] : null

  if (cultivation.status === "loading") {
    return (
      <div className="hv2-hero" aria-busy="true" aria-label="Cargando cultivo">
        <Skeleton className="hv2-hero-skeleton" />
      </div>
    )
  }

  if (cultivation.status === "empty") return <EmptyHero />

  if (cultivation.status === "failed") {
    const retryable = cultivation.reason === "network_error" || cultivation.reason === "unavailable"
    return (
      <section className="hv2-hero hv2-hero--state" aria-labelledby="hv2-crop-state" role="alert">
        <HeroMedia photo={null} />
        <div className="hv2-hero-scrim" />
        <div className="hv2-hero-body">
          <span className="hv2-hero-state-icon" data-tone="warn" aria-hidden><TriangleAlert className="size-6" /></span>
          <h2 id="hv2-crop-state" className="hv2-hero-title hv2-hero-title--state">{cultivation.title}</h2>
          <p className="hv2-hero-lead">{cultivation.detail}</p>
          {retryable && (
            <div className="hv2-hero-actions">
              <button type="button" className="hv2-button hv2-button--glass hv2-press" onClick={retryCultivation}>
                {COPY.photos.retry}
              </button>
            </div>
          )}
        </div>
      </section>
    )
  }

  const { name, scientificName, provenance, day, stage, sampleProfile } = cultivation
  return (
    <article className="hv2-hero" aria-labelledby="hv2-crop-name">
      <HeroMedia photo={latest} />
      <div className="hv2-hero-scrim" />
      <div className="hv2-hero-top">
        <ProvenanceBadge provenance={provenance} />
        {latest?.kind === "demo" && <Chip tone="sim" className="hv2-chip--caps">{COPY.photos.demoLabel}</Chip>}
      </div>
      <div className="hv2-hero-body">
        <p className="hv2-kicker">{COPY.crop.kicker}</p>
        <h2 id="hv2-crop-name" className="hv2-hero-title">
          <Link href={labHref(LAB_ROUTES.crop, request)} className="hv2-hero-link" aria-label={`${COPY.crop.details}: ${name}`}>
            {name}
          </Link>
        </h2>
        <p className="hv2-hero-species">{scientificName}</p>
        <div className="hv2-hero-meta">
          <Chip tone="ok">{stage.label}</Chip>
          {day !== null && <Chip tone="muted">{COPY.crop.day(day)}</Chip>}
          <span className="hv2-hero-pos">{COPY.crop.stagePosition(stage.position, stage.total)}</span>
        </div>
        {sampleProfile && <p className="hv2-hero-note">{COPY.crop.sampleProfile}</p>}
      </div>
      <span className="hv2-hero-go" aria-hidden><ChevronRight className="size-5" /></span>
    </article>
  )
}
