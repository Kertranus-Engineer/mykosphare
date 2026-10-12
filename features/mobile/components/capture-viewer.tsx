"use client"

import { ImageOff } from "lucide-react"
import { useState } from "react"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { SupabaseImage } from "@/features/live/live-snapshots"

export function formatCaptureDate(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return "Fecha desconocida"
  return d.toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

/** Bottom-sheet viewer for a single capture. */
export function CaptureViewer({ image, onClose }: { image: SupabaseImage | null; onClose: () => void }) {
  const [failed, setFailed] = useState<string | null>(null)
  const broken = image !== null && failed === image.url

  return (
    <Sheet open={image !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="pr-14">
          <SheetTitle>Captura</SheetTitle>
          <SheetDescription>{image ? `Subida ${formatCaptureDate(image.uploadedAt)}` : ""}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-48 items-center justify-center overflow-auto px-4 pb-4">
          {image && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URL, no image loader configured
            <img
              src={image.url}
              alt={`Captura subida ${formatCaptureDate(image.uploadedAt)}`}
              className="max-h-[70dvh] w-full rounded-2xl object-contain"
              onError={() => setFailed(image.url)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
              <ImageOff className="size-8" aria-hidden />
              <p className="text-sm">No se pudo cargar la imagen.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
