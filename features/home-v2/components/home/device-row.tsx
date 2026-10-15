"use client"

import Link from "next/link"
import { ChevronRight, Cpu } from "lucide-react"

import { RelativeTime } from "@/features/mobile/components/primitives"
import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { labHref, LAB_ROUTES } from "../../data/lab-request"
import { Card, Chip, ToneDot } from "../ui/surface"

/** One compact line for Inicio: connection, last reading, and a way to the details in Ambiente. */
export function DeviceRow() {
  const { device, request } = useHomeV2()
  return (
    <Card
      as={Link}
      href={`${labHref(LAB_ROUTES.environment, request)}#dispositivo`}
      className="hv2-device-row hv2-press"
      aria-label={`${COPY.home.deviceTitle}: ${device.label}. ${COPY.home.deviceDetails}`}
    >
      <span className="hv2-device-icon" aria-hidden><Cpu className="size-5" /></span>
      <div className="hv2-device-text">
        <p className="hv2-device-name">{COPY.home.deviceTitle}</p>
        <p className="hv2-device-sample">
          {device.lastSampleAt ? (
            <>{COPY.device.lastReading} <RelativeTime at={device.lastSampleAt} /></>
          ) : (
            COPY.device.noReading
          )}
        </p>
      </div>
      <Chip tone={device.tone} icon={<ToneDot tone={device.tone} pulse={device.kind === "live"} />}>
        {device.label}
      </Chip>
      <ChevronRight aria-hidden className="hv2-summary-go size-5" />
    </Card>
  )
}
