"use client"

import { Camera, ImageOff, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import type { SupabaseImage } from "@/features/live/live-snapshots"
import { useMobileData } from "../mobile-data-context"
import { useMobileCaptures } from "../use-captures"
import { ActivityList } from "../components/activity-list"
import { CaptureViewer, formatCaptureDate } from "../components/capture-viewer"
import { Panel } from "../components/panel"
import { DataSourceBadge, SectionHeader, Skeleton, Sparkline } from "../components/primitives"
import type { ActivityKind } from "../use-mobile-activity"

type Filter = "all" | ActivityKind

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "alert", label: "Alertas" },
  { id: "event", label: "Eventos" },
  { id: "change", label: "Cambios" },
]

const MAX_THUMBS = 30

function TrendRow({ label, unit, values, stroke }: { label: string; unit: string; values: number[]; stroke: string }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const last = values[values.length - 1]
  return (
    <div className="flex flex-col gap-1.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground/90">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {last.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </span>
      </div>
      <Sparkline values={values} stroke={stroke} className="h-14" />
      <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>mín {min.toFixed(1)}</span>
        <span>máx {max.toFixed(1)}</span>
      </div>
    </div>
  )
}

function Thumb({ image, onOpen }: { image: SupabaseImage; onOpen: () => void }) {
  const [failed, setFailed] = useState(false)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/40"
      aria-label={`Abrir captura de ${formatCaptureDate(image.uploadedAt)}`}
    >
      {failed ? (
        <span className="flex size-full items-center justify-center text-muted-foreground/60">
          <ImageOff className="size-5" aria-hidden />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URL, no image loader configured
        <img
          src={image.url}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-300 group-active:scale-105 motion-reduce:transition-none"
          onError={() => setFailed(true)}
        />
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-medium text-white/90">
        {formatCaptureDate(image.uploadedAt)}
      </span>
    </button>
  )
}

export function HistoryScreen() {
  const { tel, activity } = useMobileData()
  const captures = useMobileCaptures()
  const [filter, setFilter] = useState<Filter>("all")
  const [selected, setSelected] = useState<SupabaseImage | null>(null)

  const filtered = useMemo(
    () => (filter === "all" ? activity : activity.filter((a) => a.kind === filter)),
    [activity, filter],
  )

  const temps = tel.history.map((p) => p.temperature)
  const hums = tel.history.map((p) => p.humidity)
  const hasTrend = temps.length >= 3

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Historial</h1>

      {/* ── Trend (this session only) ───────────────────────── */}
      <section aria-label="Tendencia" className="flex flex-col gap-1">
        <SectionHeader title="Tendencia de la sesión" action={<DataSourceBadge source={tel.source} />} />
        <Panel className="divide-y divide-border/60 px-4">
          {hasTrend ? (
            <>
              <TrendRow label="Temperatura" unit="°C" values={temps} stroke="#22d3ee" />
              <TrendRow label="Humedad" unit="%" values={hums} stroke="#34d399" />
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {tel.connection.kind === "offline" ? "Sin lecturas: no hay conexión." : "Recopilando lecturas…"}
            </p>
          )}
        </Panel>
        {hasTrend && (
          <p className="px-1 pt-1 text-xs leading-relaxed text-muted-foreground">
            Últimas {temps.length} lecturas recibidas en esta sesión (máx. 30). Al cerrar la app se reinicia.
          </p>
        )}
      </section>

      {/* ── Activity ────────────────────────────────────────── */}
      <section id="actividad" aria-label="Actividad" className="flex scroll-mt-20 flex-col gap-2">
        <SectionHeader title="Actividad" />
        <div role="group" aria-label="Filtrar actividad" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                filter === f.id
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-card/70 text-muted-foreground active:bg-muted/60",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Panel className="px-4">
          <ActivityList
            items={filtered}
            emptyTitle={filter === "all" ? "Sin actividad reciente" : "Nada en esta categoría"}
            emptyHint="Los eventos se registran mientras la app está abierta; no se guardan entre sesiones."
          />
        </Panel>
      </section>

      {/* ── Captures ────────────────────────────────────────── */}
      <section id="capturas" aria-label="Capturas" className="flex scroll-mt-20 flex-col gap-2">
        <SectionHeader
          title="Historial visual"
          action={
            captures.images.length > 0 ? (
              <span className="text-xs tabular-nums text-muted-foreground">{captures.images.length} capturas</span>
            ) : undefined
          }
        />

        {captures.loading ? (
          <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : captures.error ? (
          <Panel className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <ImageOff className="size-7 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">{captures.error}</p>
            <button
              type="button"
              onClick={captures.refresh}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 text-sm font-medium active:bg-muted"
            >
              <RefreshCw className="size-4" aria-hidden />
              Reintentar
            </button>
          </Panel>
        ) : captures.images.length === 0 ? (
          <Panel className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Camera className="size-7 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium text-foreground/80">
              {captures.unavailable ? "Capturas no disponibles" : "Aún no hay capturas"}
            </p>
            <p className="max-w-[17rem] text-xs leading-relaxed text-muted-foreground">
              {captures.unavailable
                ? "El almacenamiento de imágenes no está configurado en este entorno."
                : "Cuando la cámara suba imágenes, las verás aquí en orden cronológico."}
            </p>
          </Panel>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 md:grid-cols-4">
              {captures.images.slice(0, MAX_THUMBS).map((img) => (
                <Thumb key={img.url} image={img} onOpen={() => setSelected(img)} />
              ))}
            </div>
            {captures.images.length > MAX_THUMBS && (
              <p className="text-center text-xs text-muted-foreground">
                Mostrando las {MAX_THUMBS} más recientes de {captures.images.length}.
              </p>
            )}
          </>
        )}
      </section>

      <CaptureViewer image={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
