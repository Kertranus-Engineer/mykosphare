"use client"

import { Wind, Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import { useMobileData } from "../mobile-data-context"
import { connectionTone } from "../tone"
import { ActuatorChips } from "../components/actuator-chips"
import { MetricsGrid } from "../components/metrics-grid"
import { InfoRow, Panel } from "../components/panel"
import { DataSourceBadge, RelativeTime, SectionHeader } from "../components/primitives"
import { StatusHero } from "../components/status-hero"

export function EnvironmentScreen() {
  const { tel } = useMobileData()
  const tone = connectionTone(tel.connection.kind)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Ambiente</h1>
        <DataSourceBadge source={tel.source} />
      </div>

      <StatusHero tel={tel} />

      <section aria-label="Lecturas" className="flex flex-col gap-3">
        <SectionHeader title="Lecturas actuales" />
        <MetricsGrid tel={tel} />
        <ActuatorChips fan={tel.fan} humidifier={tel.humidifier} source={tel.source} dimmed={tel.dimmed} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Las líneas muestran las lecturas recibidas durante esta sesión; no es un histórico guardado.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <section aria-label="Dispositivo" className="flex flex-col gap-1">
          <SectionHeader title="Dispositivo" />
          <Panel className="divide-y divide-border/60 px-4">
            <InfoRow label="Conexión" value={tel.connection.label} valueClassName={tone.text} />
            <InfoRow
              label="Fuente de datos"
              value={tel.source === "live" ? "ESP32 (real)" : tel.source === "simulated" ? "Simulación" : "Ninguna"}
              valueClassName={tel.source === "live" ? "text-emerald-600 dark:text-emerald-400" : tel.source === "simulated" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}
            />
            <InfoRow
              label="Último dato del dispositivo"
              value={tel.source === "live" ? <RelativeTime at={tel.lastDeviceSampleAt} /> : "—"}
              hint={tel.source !== "live" ? "Solo disponible con un ESP32 conectado" : undefined}
            />
          </Panel>
        </section>

        <section aria-label="Sensores no disponibles" className="flex flex-col gap-1">
          <SectionHeader title="Sin sensor conectado" />
          <Panel className="divide-y divide-border/60 px-4">
            <InfoRow
              label="CO₂"
              value={<Wind className={cn("size-4 text-muted-foreground/60")} aria-label="No disponible" />}
              hint="El dispositivo no reporta CO₂, por eso no se muestra ningún valor."
            />
            <InfoRow
              label="Energía"
              value={<Zap className="size-4 text-muted-foreground/60" aria-label="No disponible" />}
              hint="No hay medidor de consumo conectado."
            />
          </Panel>
        </section>
      </div>
    </div>
  )
}
