"use client"

import { AnimatePresence, m } from "framer-motion"
import { Camera, ChevronLeft, ChevronRight, Columns2, FlaskConical, ImageOff, TriangleAlert } from "lucide-react"
import { useState } from "react"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { COPY } from "../../copy"
import { formatDateTime, formatShortDate, isoOrUndefined } from "../../data/format"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { PhotoModel } from "../../data/model"
import { Photo } from "../cultivo/photo-gallery"
import { Card, Chip, EmptyState, Skeleton } from "../ui/surface"

function Lightbox({ items, index, onIndex, onClose }: { items: PhotoModel[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const photo = index === null ? null : items[index]
  return (
    <Sheet open={photo !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" lang="es" className="hv2-sheet max-h-[92dvh] gap-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pr-14">
          <SheetTitle className="hv2-sheet-title">{COPY.historyPage.viewerTitle}</SheetTitle>
          <SheetDescription className="hv2-sheet-desc">{photo ? formatDateTime(photo.capturedAt) : ""}</SheetDescription>
        </SheetHeader>
        {photo && index !== null && (
          <div className="hv2-sheet-body">
            <div className="hv2-lightbox">
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={photo.id}
                  className="hv2-lightbox-frame"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Photo photo={photo} className="hv2-lightbox-img" eager />
                </m.div>
              </AnimatePresence>
              <button type="button" className="hv2-viewer-nav hv2-viewer-nav--prev hv2-press" disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label={COPY.photos.previous}>
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <button type="button" className="hv2-viewer-nav hv2-viewer-nav--next hv2-press" disabled={index === items.length - 1} onClick={() => onIndex(index + 1)} aria-label={COPY.photos.next}>
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </div>
            <p className="hv2-caption">
              {COPY.photos.counter(index + 1, items.length)}
              {photo.kind === "demo" && <> · <Chip tone="sim" className="hv2-chip--caps">{COPY.photos.demoLabel}</Chip></>}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Chronological grid of captures (newest first) with a lightbox. Read-only. */
export function PhotosTab() {
  const { photos, retryPhotos } = useHomeV2()
  const [open, setOpen] = useState<number | null>(null)

  if (photos.status === "loading") {
    return (
      <div className="hv2-gallery-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="hv2-grid-skeleton" />
        ))}
      </div>
    )
  }
  if (photos.status !== "ready") {
    const copy = {
      empty: { icon: <Camera className="size-6" />, title: COPY.photos.emptyTitle, body: COPY.photos.emptyBody },
      unavailable: { icon: <ImageOff className="size-6" />, title: COPY.photos.unavailableTitle, body: COPY.photos.unavailableBody },
      error: { icon: <TriangleAlert className="size-6" />, title: COPY.photos.errorTitle, body: undefined },
    }[photos.status]
    return (
      <Card role={photos.status === "error" ? "alert" : undefined}>
        <EmptyState
          icon={copy.icon}
          title={copy.title}
          body={copy.body}
          action={
            photos.status === "error" ? (
              <button type="button" className="hv2-button hv2-button--secondary hv2-press" onClick={retryPhotos}>
                {COPY.photos.retry}
              </button>
            ) : undefined
          }
        />
      </Card>
    )
  }

  const { items } = photos
  const newestFirst = items.map((photo, index) => ({ photo, index })).reverse()
  const [latest, ...older] = newestFirst
  const label = (photo: PhotoModel) => (photo.day !== undefined ? COPY.crop.day(photo.day) : formatShortDate(photo.capturedAt))
  return (
    <div className="hv2-stack hv2-stack--tight">
      <p className="hv2-caption hv2-photos-count">{COPY.historyPage.photosCount(items.length)}</p>

      <button
        type="button"
        className="hv2-featured hv2-press"
        aria-label={COPY.historyPage.open(formatShortDate(latest.photo.capturedAt))}
        onClick={() => setOpen(latest.index)}
      >
        <Photo photo={latest.photo} className="hv2-featured-img" eager />
        <span className="hv2-featured-scrim" aria-hidden />
        <span className="hv2-featured-text">
          <span className="hv2-eyebrow">{COPY.historyPage.latestTitle}</span>
          <span className="hv2-featured-day">{label(latest.photo)}</span>
          <time className="hv2-featured-date" dateTime={isoOrUndefined(latest.photo.capturedAt)}>{formatDateTime(latest.photo.capturedAt)}</time>
        </span>
        {latest.photo.kind === "demo" && <span className="hv2-thumb-demo" aria-hidden>{COPY.photos.demoBadge}</span>}
      </button>

      {older.length > 0 && (
        <>
          <h2 className="hv2-eyebrow hv2-tl-heading">{COPY.historyPage.allTitle}</h2>
          <ul className="hv2-gallery-grid">
            {older.map(({ photo, index }) => (
              <li key={photo.id}>
                <button
                  type="button"
                  className="hv2-thumb hv2-thumb--grid hv2-press"
                  aria-label={COPY.historyPage.open(formatShortDate(photo.capturedAt))}
                  onClick={() => setOpen(index)}
                >
                  <Photo photo={photo} className="hv2-thumb-img" thumb />
                  {photo.kind === "demo" && <span className="hv2-thumb-demo hv2-thumb-demo--dot" aria-hidden><FlaskConical className="size-3" /></span>}
                  <time className="hv2-thumb-date" dateTime={isoOrUndefined(photo.capturedAt)}>{label(photo)}</time>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Structure for comparing two dates later. Nothing is compared today. */}
      <Card className="hv2-compare" aria-labelledby="hv2-compare-h">
        <div className="hv2-compare-head">
          <Columns2 aria-hidden className="size-5" />
          <h2 id="hv2-compare-h" className="hv2-compare-title">{COPY.historyPage.compareTitle}</h2>
          <Chip tone="info" className="hv2-chip--caps">{COPY.historyPage.compareBadge}</Chip>
        </div>
        <div className="hv2-compare-slots" aria-hidden>
          <span className="hv2-compare-slot">{COPY.historyPage.compareSlotA}</span>
          <span className="hv2-compare-slot">{COPY.historyPage.compareSlotB}</span>
        </div>
        <p className="hv2-caption">{COPY.historyPage.compareBody}</p>
      </Card>

      <p className="hv2-caption">{items.some((photo) => photo.kind === "demo") ? COPY.photos.demoNote : COPY.photos.unlinked}</p>
      <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </div>
  )
}
