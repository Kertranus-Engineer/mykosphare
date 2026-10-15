"use client"

import { Cpu, Fan, Waves } from "lucide-react"

import { RelativeTime } from "@/features/mobile/components/primitives"
import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import type { ActuatorModel } from "../../data/model"
import { Card, Chip, SectionHeading, ToneDot } from "../ui/surface"

const STATE_LABEL = { on: COPY.device.on, off: COPY.device.off, unknown: COPY.device.unknown } as const

function ActuatorPill({ actuator }: { actuator: ActuatorModel }) {
  const Icon = actuator.id === "fan" ? Fan : Waves
  return (
    <li className="hv2-actuator" data-state={actuator.state}>
      <Icon aria-hidden className="size-4" />
      <span className="hv2-actuator-name">{actuator.label}</span>
      <span className="hv2-actuator-state">{STATE_LABEL[actuator.state]}</span>
    </li>
  )
}

export function DeviceCard() {
  const { device } = useHomeV2()
  const note =
    device.kind === "simulated" ? COPY.device.simulatedNote : device.kind === "offline" || device.kind === "stale" ? COPY.device.offlineNote : null

  return (
    <section aria-labelledby="hv2-device-h" className="hv2-block">
      <SectionHeading id="hv2-device-h" title={COPY.home.deviceTitle} />
      <Card className="hv2-device" tone={device.tone}>
        <div className="hv2-device-row">
          <span className="hv2-device-icon" aria-hidden><Cpu className="size-5" /></span>
          <div className="hv2-device-text">
            <p className="hv2-device-name">ESP32</p>
            <p className="hv2-device-sample">
              {device.lastSampleAt ? (
                <>{COPY.device.lastSample} <RelativeTime at={device.lastSampleAt} /></>
              ) : (
                COPY.device.noSample
              )}
            </p>
          </div>
          <Chip tone={device.tone} icon={<ToneDot tone={device.tone} pulse={device.kind === "live"} />}>
            {device.label}
          </Chip>
        </div>

        <div className="hv2-device-actuators">
          <p className="hv2-eyebrow">{COPY.device.reported}</p>
          <ul className="hv2-actuator-list">
            {device.actuators.map((actuator) => (
              <ActuatorPill key={actuator.id} actuator={actuator} />
            ))}
          </ul>
        </div>

        {note && <p className="hv2-device-note">{note}</p>}
        <p className="hv2-caption hv2-device-readonly">{COPY.device.readOnly}</p>
      </Card>
    </section>
  )
}
