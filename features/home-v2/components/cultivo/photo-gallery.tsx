"use client"

import { AnimatePresence, m, useReducedMotion, type PanInfo } from "framer-motion"
import { Camera, ChevronLeft, ChevronRight, ImageOff, Images, TriangleAlert } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"

import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { COPY } from "../../copy"
import { formatDateTime, formatShortDate, isoOrUndefined } from "../../data/format"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { PhotoModel } from "../../data/model"
import { Chip, EmptyState, SectionHeading, Skeleton } from "../ui/surface"

const SWIPE_DISTANCE = 56
const SWIPE_VELOCITY = 480

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -40, scale: 0.985 }),
}

export function Photo({ photo, className, eager = false }: { photo: PhotoModel; className?: string; eager?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (failedUrl === photo.url) {
    return (
      <span className={cn("hv2-photo-fail", className)} role="img" aria-label={COPY.photos.imageFailed}>
        <ImageOff aria-hidden className="size-6" />
        <span>{COPY.photos.imageFailed}</span>
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URL / data URI, no image loader configured
    <img
      src={photo.url}
      alt=""
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onError={() => setFailedUrl(photo.url)}
    />
  )
}

function Stage({
  items,
  index,
  direction,
  onStep,
  onOpenGallery,
}: {
  items: PhotoModel[]
  index: number
  direction: number
  onStep: (delta: number) => void
  onOpenGallery: () => void
}) {
  const photo = items[index]
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); onStep(-1) }
    if (event.key === "ArrowRight") { event.preventDefault(); onStep(1) }
  }
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_DISTANCE || Math.abs(info.velocity.x) > SWIPE_VELOCITY) {
      onStep(info.offset.x < 0 ? 1 : -1)
    }
  }
  const isLatest = index === items.length - 1

  return (
    <div
      className="hv2-viewer"
      role="group"
      aria-roledescription="carrusel"
      aria-label={COPY.photos.mainTitle}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <AnimatePresence initial={false} custom={direction}>
        <m.div
          key={photo.id}
          className="hv2-viewer-slide"
          custom={direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <m.div
            className="hv2-viewer-drag"
            drag="x"
            dragSnapToOrigin
            dragElastic={0.2}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={onDragEnd}
          >
            <Photo photo={photo} className="hv2-viewer-img" eager />
          </m.div>
        </m.div>
      </AnimatePresence>

      <p className="hv2-sr-only" aria-live="polite">{`${COPY.photos.mainTitle} ${COPY.photos.counter(index + 1, items.length)}`}</p>

      <div className="hv2-viewer-scrim" aria-hidden />

      <div className="hv2-viewer-top">
        <Chip tone="muted" className="hv2-chip--glass">
          <time dateTime={isoOrUndefined(photo.capturedAt)}>{formatDateTime(photo.capturedAt)}</time>
        </Chip>
        <Chip tone="muted" className="hv2-chip--glass">{COPY.photos.counter(index + 1, items.length)}</Chip>
      </div>

      <button type="button" className="hv2-viewer-nav hv2-viewer-nav--prev hv2-press" onClick={() => onStep(-1)} disabled={index === 0} aria-label={COPY.photos.previous}>
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      <button type="button" className="hv2-viewer-nav hv2-viewer-nav--next hv2-press" onClick={() => onStep(1)} disabled={isLatest} aria-label={COPY.photos.next}>
        <ChevronRight aria-hidden className="size-5" />
      </button>

      <div className="hv2-viewer-bottom">
        <div className="hv2-viewer-tags">
          {photo.kind === "demo" ? (
            <Chip tone="sim" className="hv2-chip--caps hv2-chip--solid">{COPY.photos.demoLabel}</Chip>
          ) : (
            <Chip tone="ok" className="hv2-chip--glass">{isLatest ? COPY.photos.latest : COPY.photos.realLabel}</Chip>
          )}
        </div>
        <button type="button" className="hv2-button hv2-button--glass hv2-press" onClick={onOpenGallery}>
          <Images aria-hidden className="size-4" />
          {COPY.photos.gallery}
        </button>
      </div>
    </div>
  )
}

function Timeline({ items, selectedId, onSelect }: { items: PhotoModel[]; selectedId: string; onSelect: (id: string) => void }) {
  const listRef = useRef<HTMLUListElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const list = listRef.current
    const current = list?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!list || !current) return
    const left = current.offsetLeft - (list.clientWidth - current.clientWidth) / 2
    list.scrollTo({ left, behavior: reduce ? "auto" : "smooth" })
  }, [selectedId, reduce])

  return (
    <ul ref={listRef} className="hv2-timeline" aria-label={COPY.photos.timelineTitle}>
      {items.map((photo) => {
        const selected = photo.id === selectedId
        return (
          <li key={photo.id} className="hv2-timeline-item">
            <button
              type="button"
              className="hv2-thumb hv2-press"
              aria-current={selected ? "true" : undefined}
              aria-label={COPY.photos.select(formatShortDate(photo.capturedAt))}
              onClick={() => onSelect(photo.id)}
            >
              <Photo photo={photo} className="hv2-thumb-img" />
              {photo.kind === "demo" && <span className="hv2-thumb-demo" aria-hidden>{COPY.photos.demoBadge}</span>}
              <span className="hv2-thumb-date">{formatShortDate(photo.capturedAt)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function GallerySheet({
  open,
  onOpenChange,
  items,
  selectedId,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: PhotoModel[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" lang="es" className="hv2-sheet max-h-[88dvh] gap-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pr-14">
          <SheetTitle className="hv2-sheet-title">{COPY.photos.gallery}</SheetTitle>
          <SheetDescription className="hv2-sheet-desc">{COPY.photos.count(items.length)}</SheetDescription>
        </SheetHeader>
        <div className="hv2-sheet-body">
          <ul className="hv2-gallery-grid">
            {[...items].reverse().map((photo) => (
              <li key={photo.id}>
                <button
                  type="button"
                  className="hv2-thumb hv2-thumb--grid hv2-press"
                  aria-current={photo.id === selectedId ? "true" : undefined}
                  aria-label={COPY.photos.select(formatShortDate(photo.capturedAt))}
                  onClick={() => { onSelect(photo.id); onOpenChange(false) }}
                >
                  <Photo photo={photo} className="hv2-thumb-img" />
                  {photo.kind === "demo" && <span className="hv2-thumb-demo" aria-hidden>{COPY.photos.demoBadge}</span>}
                  <span className="hv2-thumb-date">{formatShortDate(photo.capturedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function PhotoGallery() {
  const { photos, retryPhotos } = useHomeV2()
  const [selection, setSelection] = useState<{ id: string | null; direction: number }>({ id: null, direction: 1 })
  const [galleryOpen, setGalleryOpen] = useState(false)

  const items = photos.status === "ready" ? photos.items : null
  const foundIndex = items && selection.id ? items.findIndex((photo) => photo.id === selection.id) : -1
  // Default to the newest photo; a selection that no longer exists falls back to it too.
  const index = items ? (foundIndex >= 0 ? foundIndex : items.length - 1) : -1

  const step = useCallback(
    (delta: number) => {
      if (!items) return
      const next = Math.min(items.length - 1, Math.max(0, index + delta))
      if (next !== index) setSelection({ id: items[next].id, direction: delta > 0 ? 1 : -1 })
    },
    [items, index],
  )

  const select = useCallback(
    (id: string) => {
      if (!items) return
      const next = items.findIndex((photo) => photo.id === id)
      if (next >= 0 && next !== index) setSelection({ id, direction: next > index ? 1 : -1 })
    },
    [items, index],
  )

  return (
    <section aria-labelledby="hv2-photos-h" className="hv2-block">
      <SectionHeading id="hv2-photos-h" title={COPY.photos.mainTitle} />

      {photos.status === "loading" && <Skeleton className="hv2-viewer-skeleton" />}

      {photos.status === "empty" && (
        <div className="hv2-viewer hv2-viewer--state">
          <EmptyState icon={<Camera className="size-6" />} title={COPY.photos.emptyTitle} body={COPY.photos.emptyBody} />
        </div>
      )}

      {photos.status === "unavailable" && (
        <div className="hv2-viewer hv2-viewer--state">
          <EmptyState icon={<ImageOff className="size-6" />} title={COPY.photos.unavailableTitle} body={COPY.photos.unavailableBody} />
        </div>
      )}

      {photos.status === "error" && (
        <div className="hv2-viewer hv2-viewer--state" role="alert">
          <EmptyState
            icon={<TriangleAlert className="size-6" />}
            title={COPY.photos.errorTitle}
            action={
              <button type="button" className="hv2-button hv2-button--secondary hv2-press" onClick={retryPhotos}>
                {COPY.photos.retry}
              </button>
            }
          />
        </div>
      )}

      {items && index >= 0 && (
        <>
          <Stage items={items} index={index} direction={selection.direction} onStep={step} onOpenGallery={() => setGalleryOpen(true)} />
          <Timeline items={items} selectedId={items[index].id} onSelect={select} />
          <p className="hv2-caption">{items[index].kind === "demo" ? COPY.photos.demoNote : COPY.photos.unlinked}</p>
          <GallerySheet open={galleryOpen} onOpenChange={setGalleryOpen} items={items} selectedId={items[index].id} onSelect={select} />
        </>
      )}
    </section>
  )
}
