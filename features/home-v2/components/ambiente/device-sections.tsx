"use client"

import { Fan, Waves } from "lucide-react"

import { RelativeTime } from "@/features/mobile/components/primitives"
import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { ActuatorModel } from "../../data/model"
import { Card, Chip, SectionHeading, ToneDot } from "../ui/surface"

const STATE_LABEL = { on: COPY.device.on, off: COPY.device.off, unknown: COPY.device.unknown } as const

function ActuatorTile({ actuator }: { actuator: ActuatorModel }) {
  const Icon = actuator.id === "fan" ? Fan : Waves
  return (
    <li className="hv2-actuator" data-state={actuator.state}>
      <span className="hv2-actuator-icon" aria-hidden><Icon className="size-6" /></span>
      <span className="hv2-actuator-name">{actuator.label}</span>
      <span className="hv2-actuator-state">
        <ToneDot tone={actuator.state === "on" ? "ok" : "muted"} />
        {STATE_LABEL[actuator.state]}
      </span>
    </li>
  )
}

/** Actuators as reported by the device. Read-only: nothing here commands hardware. */
export function ActuatorsSection() {
  const { device } = useHomeV2()
  const unknown = device.actuators.every((actuator) => actuator.state === "unknown")
  return (
    <section aria-labelledby="hv2-actuators-h" className="hv2-block">
      <SectionHeading id="hv2-actuators-h" title={COPY.device.actuatorsTitle} />
      <Card className="hv2-actuators-card">
        <ul className="hv2-actuator-list">
          {device.actuators.map((actuator) => (
            <ActuatorTile key={actuator.id} actuator={actuator} />
          ))}
        </ul>
        <p className="hv2-caption">{unknown ? COPY.device.actuatorsUnknown : COPY.device.actuatorsNote}</p>
      </Card>
    </section>
  )
}

/** Connection, source and last reading, with the reason when the device is not reporting. */
export function DeviceDetails() {
  const { device } = useHomeV2()
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
      <SectionHeading id="hv2-device-h" title={COPY.home.deviceTitle} />
      <Card className="hv2-device" tone={device.tone}>
        <dl className="hv2-device-list">
          <div className="hv2-device-item">
            <dt>{COPY.device.connection}</dt>
            <dd>
              <Chip tone={device.tone} icon={<ToneDot tone={device.tone} pulse={device.kind === "live"} />}>{device.label}</Chip>
            </dd>
          </div>
          <div className="hv2-device-item">
            <dt>{COPY.device.source}</dt>
            <dd>{COPY.device.sources[device.provenance]}</dd>
          </div>
          <div className="hv2-device-item">
            <dt>{COPY.device.lastReading}</dt>
            <dd>{device.lastSampleAt ? <RelativeTime at={device.lastSampleAt} /> : COPY.device.noReading}</dd>
          </div>
        </dl>
        {note && <p className="hv2-device-note">{note}</p>}
      </Card>
    </section>
  )
}
