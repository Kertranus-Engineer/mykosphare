"use client"

import { Droplets, Thermometer } from "lucide-react"

import type { MobileTelemetry } from "../use-mobile-telemetry"
import { MetricTile } from "./metric-tile"

/** Temperature + humidity tiles. The only two quantities the device actually measures. */
export function MetricsGrid({ tel }: { tel: MobileTelemetry }) {
  const loading = tel.connection.kind === "connecting" && !tel.hasData
  const temps = tel.history.map((p) => p.temperature)
  const hums = tel.history.map((p) => p.humidity)

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricTile
        icon={Thermometer}
        label="Temperatura"
        unit="°C"
        decimals={1}
        reading={tel.temperature}
        source={tel.source}
        dimmed={tel.dimmed}
        loading={loading}
        series={temps}
      />
      <MetricTile
        icon={Droplets}
        label="Humedad"
        unit="%"
        decimals={1}
        reading={tel.humidity}
        source={tel.source}
        dimmed={tel.dimmed}
        loading={loading}
        series={hums}
      />
    </div>
  )
}
