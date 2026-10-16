"use client"

import Link from "next/link"
import { Activity, ChevronRight, Cpu, Eye, Leaf, ShieldAlert, SignalZero, type LucideIcon } from "lucide-react"

import { RelativeTime } from "@/features/mobile/components/primitives"
import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { labHref, LAB_ROUTES } from "../../data/lab-request"
import type { StatusLevel } from "../../data/model"
import { Card, ProvenanceBadge, Skeleton, ToneDot } from "../ui/surface"

const ICON: Record<StatusLevel, LucideIcon> = {
  stable: Leaf,
  optimizing: Activity,
  prealert: Eye,
  alert: ShieldAlert,
  nodata: SignalZero,
}

/**
 * General state of the environment in one card, plus the device line. The level
 * only changes the icon, colour and a soft ring: the wording always comes from the
 * model, so it never says more than the data says.
 */
export function StatusCard() {
  const { environment, request } = useHomeV2()

  if (environment.status === "waiting") {
    const loading = environment.reason === "loading"
    return (
      <Card className="hv2-status" data-level="nodata" tone="muted" aria-busy={loading || undefined}>
        <div className="hv2-status-main">
          <span className="hv2-status-orb" aria-hidden>
            {loading ? <Skeleton className="hv2-status-orb-skeleton" /> : <SignalZero className="size-6" />}
          </span>
          <div className="hv2-status-text">
            <p className="hv2-status-label">{COPY.home.statusTitle}</p>
            <p className="hv2-status-value">{loading ? COPY.environment.waitingTitle : COPY.home.statusNoData}</p>
            <p className="hv2-status-detail">{loading ? COPY.environment.waitingDetail : environment.detail}</p>
          </div>
        </div>
        <DeviceLine />
      </Card>
    )
  }

  const overall = environment.overall
  const level: StatusLevel = overall?.level ?? "nodata"
  const Icon = ICON[level]
  return (
    <Card
      as={Link}
      href={labHref(LAB_ROUTES.environment, request)}
      className="hv2-status hv2-press"
      data-level={level}
      tone={overall?.tone ?? "muted"}
      aria-label={`${COPY.home.statusTitle}: ${overall?.label ?? COPY.home.statusNoData}. ${COPY.home.viewEnvironment}`}
    >
      <div className="hv2-status-main">
        <span className="hv2-status-orb" aria-hidden><Icon className="size-6" /></span>
        <div className="hv2-status-text">
          <p className="hv2-status-label">
            {COPY.home.statusTitle}
            <ProvenanceBadge provenance={environment.provenance} className="hv2-status-badge" quietSimulated />
          </p>
          {overall ? (
            <>
              <p className="hv2-status-value">{overall.label}</p>
              <p className="hv2-status-detail">{overall.detail}</p>
            </>
          ) : (
            <Skeleton className="hv2-status-skeleton" />
          )}
        </div>
        <ChevronRight aria-hidden className="hv2-summary-go size-5" />
      </div>
      <DeviceLine />
    </Card>
  )
}

function DeviceLine() {
  const { device } = useHomeV2()
  return (
    <div className="hv2-status-device">
      <span className="hv2-status-device-icon" aria-hidden><Cpu className="size-4" /></span>
      <span className="hv2-status-device-text">
        <ToneDot tone={device.tone} pulse={device.kind === "live"} />
        <span className="hv2-status-device-name">{device.label}</span>
        <span aria-hidden>·</span>
        <span className="hv2-status-device-sample">
          {device.lastSampleAt ? (
            <>
              {COPY.device.lastReading} <RelativeTime at={device.lastSampleAt} />
            </>
          ) : (
            COPY.device.noReading
          )}
        </span>
      </span>
    </div>
  )
}
