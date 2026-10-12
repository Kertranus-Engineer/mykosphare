"use client"

import { AlertTriangle, CloudOff, FlaskConical, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { needsAttention, STATE_ES } from "../i18n"
import { heroTone } from "../tone"
import type { MobileTelemetry } from "../use-mobile-telemetry"
import { DataSourceBadge, RelativeTime } from "./primitives"

function Notice({ tone, icon: Icon, children }: { tone: "amber" | "red" | "muted"; icon: typeof AlertTriangle; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed",
        tone === "amber" && "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        tone === "red" && "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200",
        tone === "muted" && "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0">{children}</span>
    </div>
  )
}

export function StatusHero({ tel }: { tel: MobileTelemetry }) {
  const { env, source, connection, hasData, envReady } = tel
  const kind = connection.kind
  const tone = heroTone(env.state, source, kind)

  const connecting = kind === "connecting"
  const offline = kind === "offline"
  const pendingState = hasData && !envReady && !offline
  const showState = hasData && envReady && !connecting

  const meta = STATE_ES[env.state]
  const attention = showState && source === "live" && needsAttention(env.state)

  const chipLabel = attention
    ? `Requiere atención · ${meta.label}`
    : env.state === "STABLE" || env.state === "OPTIMIZING"
      ? "Estable"
      : "En vigilancia"

  let title = meta.title
  let subtitle = meta.subtitle
  if (connecting) {
    title = "Conectando…"
    subtitle = "Esperando la primera lectura del sistema"
  } else if (offline) {
    title = "Sin conexión"
    subtitle = hasData ? "Mostrando los últimos valores recibidos" : "No se han recibido datos del dispositivo"
  } else if (pendingState) {
    title = "Calculando estado…"
    subtitle = "Analizando las primeras lecturas"
  } else if (source === "simulated") {
    title = "Modelo simulado"
    subtitle = `Estado del modelo: ${meta.label}`
  }

  const Icon = connecting || pendingState ? Loader2 : offline ? CloudOff : env.icon

  return (
    <section
      aria-labelledby="hero-title"
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-card/90 p-4 shadow-[0_0_40px_-16px] shadow-emerald-500/25 animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none",
        tone.border,
        source === "simulated" && "border-dashed",
      )}
    >
      <div
        aria-hidden
        className={cn("pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-gradient-to-br to-transparent blur-2xl", tone.glow)}
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DataSourceBadge source={source} />
          <span className="text-xs text-muted-foreground tabular-nums">
            {source === "live" && tel.lastDeviceSampleAt ? (
              <>Actualizado <RelativeTime at={tel.lastDeviceSampleAt} /></>
            ) : source === "simulated" ? (
              "Valores generados"
            ) : null}
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <div className={cn("relative flex size-14 shrink-0 items-center justify-center rounded-2xl border", tone.bg, tone.border)}>
            {showState && !offline && (
              <span aria-hidden className={cn("absolute inset-0 rounded-2xl animate-pulse opacity-40 motion-reduce:animate-none", tone.bg)} />
            )}
            <Icon
              className={cn("relative size-7", tone.text, (connecting || pendingState) && "animate-spin motion-reduce:animate-none")}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 id="hero-title" className="text-xl font-bold leading-tight tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {showState && !offline && source === "live" && (
          <div className="flex flex-wrap gap-2">
            <span className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold", tone.bg, tone.border, tone.text)}>
              <span className={cn("size-1.5 rounded-full", tone.dot, source === "live" && !attention && "animate-pulse motion-reduce:animate-none")} />
              {chipLabel}
            </span>
            {!attention && env.state !== "STABLE" && (
              <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground">
                {meta.label}
              </span>
            )}
          </div>
        )}

        {source === "simulated" && !offline && (
          <Notice tone="amber" icon={FlaskConical}>
            <strong className="font-semibold">Datos simulados.</strong> No hay un ESP32 enviando telemetría; estas cifras no reflejan tu cultivo.
          </Notice>
        )}
        {offline && (
          <Notice tone="red" icon={CloudOff}>
            {hasData
              ? "Se perdió la conexión. Los valores mostrados no están actualizándose."
              : "No hay conexión con el servidor de telemetría. Reintentando automáticamente."}
          </Notice>
        )}
        {kind === "stale" && (
          <Notice tone="amber" icon={AlertTriangle}>
            El dispositivo dejó de reportar hace unos segundos. Los valores pueden estar desactualizados.
          </Notice>
        )}
        {kind === "degraded" && (
          <Notice tone="amber" icon={AlertTriangle}>
            La conexión es inestable. Algunas lecturas podrían retrasarse.
          </Notice>
        )}
      </div>
    </section>
  )
}
