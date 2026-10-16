"use client"

import { Check, Cpu, Droplets, Fan, Thermometer, Waves, X } from "lucide-react"

import { RelativeTime } from "@/features/mobile/components/primitives"
import { cn } from "@/lib/utils"
import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { ActuatorModel, MetricModel } from "../../data/model"
import { Card, Chip, ProvenanceBadge, SectionHeading, ToneDot } from "../ui/surface"

const STATE_LABEL = { on: COPY.device.on, off: COPY.device.off, unknown: COPY.device.unknown } as const
const SENSOR_ICON = { temperature: Thermometer, humidity: Droplets } as const

function SensorChip({ metric, available }: { metric: MetricModel; available: boolean }) {
  const Icon = SENSOR_ICON[metric.id]
  return (
    <li className={cn("hv2-sensor", available && "is-on")}>
      <Icon aria-hidden className="size-4" />
      <span className="hv2-sensor-name">{metric.label}</span>
      {available ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
      <span className="hv2-sr-only">{available ? COPY.device.sensorOn : COPY.device.sensorOff}</span>
    </li>
  )
}

function ActuatorTile({ actuator }: { actuator: ActuatorModel }) {
  const Icon = actuator.id === "fan" ? Fan : Waves
  return (
    <li className="hv2-actuator" data-state={actuator.state}>
      <span className="hv2-actuator-icon" aria-hidden><Icon className="size-5" /></span>
      <span className="hv2-actuator-text">
        <span className="hv2-actuator-name">{actuator.label}</span>
        <span className="hv2-actuator-state">
          <ToneDot tone={actuator.state === "on" ? "ok" : "muted"} />
          {STATE_LABEL[actuator.state]}
        </span>
      </span>
    </li>
  )
}

/**
 * The ESP32 in one compact card: connection, source, last reading, which sensors report, and the
 * actuators as the device reports them. Read-only: nothing here commands hardware.
 */
export function DeviceDetails() {
  const { device, environment } = useHomeV2()
  const metrics = environment.status === "ready" ? environment.metrics : []
  const unknown = device.actuators.every((actuator) => actuator.state === "unknown")
  const note =
    device.kind === "simulated"
      ? COPY.device.simulatedNote
      : device.provenance === "unavailable" && device.kind === "offline"
        ? COPY.device.disconnectedNote
        : device.kind === "offline" || device.kind === "stale"
          ? COPY.device.offlineNote
          : null

  return (
    <section id="dispositivo" aria-labelledby="hv2-device-h" className="hv2-block hv2-anchor">
      <SectionHeading id="hv2-device-h" title={COPY.home.deviceTitle} action={<ProvenanceBadge provenance={device.provenance} />} />
      <Card className="hv2-device" tone={device.tone}>
        <div className="hv2-device-head">
          <span className="hv2-device-icon" aria-hidden><Cpu className="size-5" /></span>
          <div className="hv2-device-text">
            <p className="hv2-device-name">{COPY.device.board}</p>
            <p className="hv2-device-sample">
              {device.lastSampleAt ? (
                <>
                  {COPY.device.lastReading} <RelativeTime at={device.lastSampleAt} />
                </>
              ) : (
                COPY.device.noReading
              )}
            </p>
          </div>
          <Chip tone={device.tone} icon={<ToneDot tone={device.tone} pulse={device.kind === "live"} />}>{device.label}</Chip>
        </div>

        <div className="hv2-device-group">
          <p className="hv2-eyebrow">{COPY.device.sensorsTitle}</p>
          {metrics.length > 0 ? (
            <ul className="hv2-sensor-list">
              {metrics.map((metric) => (
                <SensorChip key={metric.id} metric={metric} available={metric.value !== null} />
              ))}
            </ul>
          ) : (
            <p className="hv2-caption">{COPY.device.noSensors}</p>
          )}
        </div>

        <div className="hv2-device-group">
          <p className="hv2-eyebrow">{COPY.device.actuatorsTitle}</p>
          <ul className="hv2-actuator-list">
            {device.actuators.map((actuator) => (
              <ActuatorTile key={actuator.id} actuator={actuator} />
            ))}
          </ul>
          <p className="hv2-caption">{unknown ? COPY.device.actuatorsUnknown : device.provenance === "simulated" ? COPY.device.actuatorsDemo : COPY.device.actuatorsNote}</p>
        </div>

        {note && <p className="hv2-device-note">{note}</p>}
      </Card>
    </section>
  )
}
