"use client"

import Link from "next/link"
import { Camera, ImageOff, RefreshCw } from "lucide-react"
import { useState } from "react"

import type { MobileCaptures } from "../use-captures"
import { CaptureViewer, formatCaptureDate } from "./capture-viewer"
import { RelativeTime, Skeleton } from "./primitives"

export function LatestCaptureCard({ captures }: { captures: MobileCaptures }) {
  const { latest, loading, error, unavailable, refresh } = captures
  const [open, setOpen] = useState(false)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const imageFailed = latest !== null && failedUrl === latest.url

  let body: React.ReactNode
  if (loading) {
    body = <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
  } else if (error) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
        <ImageOff className="size-7 text-muted-foreground/60" aria-hidden />
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 text-sm font-medium text-foreground active:bg-muted"
        >
          <RefreshCw className="size-4" aria-hidden />
          Reintentar
        </button>
      </div>
    )
  } else if (!latest) {
    body = (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
        <Camera className="size-7 text-muted-foreground/60" aria-hidden />
        <p className="text-sm font-medium text-foreground/80">
          {unavailable ? "Capturas no disponibles" : "Aún no hay capturas"}
        </p>
        <p className="max-w-[17rem] text-xs leading-relaxed text-muted-foreground">
          {unavailable
            ? "El almacenamiento de imágenes no está configurado en este entorno."
            : "Cuando la cámara suba una imagen, aparecerá aquí."}
        </p>
      </div>
    )
  } else {
    body = (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-muted/30 text-left"
        aria-label="Abrir la última captura"
      >
        {imageFailed ? (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-7" aria-hidden />
            <span className="text-sm">No se pudo cargar la imagen</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URL, no image loader configured
          <img
            src={latest.url}
            alt={`Última captura, subida ${formatCaptureDate(latest.uploadedAt)}`}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-active:scale-[1.02] motion-reduce:transition-none"
            onError={() => setFailedUrl(latest.url)}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3.5 pb-3 pt-8">
          <p className="text-xs font-medium text-white/90">
            Subida <RelativeTime at={latest.uploadedAt} />
          </p>
          <p className="text-[11px] text-white/60">{formatCaptureDate(latest.uploadedAt)}</p>
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {body}
      <Link
        href="/home-v1/history#capturas"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-4 text-sm font-medium text-cyan-600 dark:text-cyan-400 transition-colors active:bg-cyan-500/10"
      >
        <Camera className="size-4" aria-hidden />
        Ver historial visual
      </Link>
      <CaptureViewer image={open ? latest : null} onClose={() => setOpen(false)} />
    </div>
  )
}
