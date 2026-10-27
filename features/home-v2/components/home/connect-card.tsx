"use client"

import Link from "next/link"
import { ArrowRight, BellRing, Camera, Check, Cpu, Fan, Sparkles, Thermometer, type LucideIcon } from "lucide-react"

import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { useFeedback } from "../feedback"
import { Card } from "../ui/surface"

const ITEM_ICON: Record<string, LucideIcon> = {
  readings: Thermometer,
  actuators: Fan,
  activity: BellRing,
  photos: Camera,
  insight: Sparkles,
}

/**
 * Shown only in the example view, right under the crop: it says plainly that this is a sample,
 * lists what the person's own data will actually include (and what is still to come), and shows
 * that the switch is automatic. If a device is already connected but the example was pinned on,
 * it offers the way back to real data instead.
 */
export function ConnectCard() {
  const { mode, deviceSeen, setDemo, cloudStatus } = useHomeV2()
  const { notify } = useFeedback()
  if (mode !== "demo") return cloudStatus === "loading" || deviceSeen ? null : (
    <Card as="section" className="hv2-connect">
      <h2 className="hv2-connect-title">Conecta tu ESP32</h2>
      <p>Consulta el dispositivo de tu cuenta y sus lecturas reales.</p>
      <Link href={COPY.demo.connectHref} className="hv2-button hv2-button--primary">Conectar<ArrowRight aria-hidden className="size-4" /></Link>
    </Card>
  )
  const copy = COPY.connectCard

  return (
    <Card as="section" className="hv2-connect" aria-labelledby="hv2-connect-h">
      <div className="hv2-connect-head">
        <span className="hv2-connect-icon" aria-hidden>
          <Cpu className="size-6" />
          <span className="hv2-connect-ping" />
        </span>
        <div className="hv2-connect-heading">
          <p className="hv2-connect-kicker">{copy.kicker}</p>
          <h2 id="hv2-connect-h" className="hv2-connect-title">{deviceSeen ? copy.connectedTitle : copy.title}</h2>
        </div>
      </div>

      <p className="hv2-connect-lead">{deviceSeen ? copy.connectedLead : copy.lead}</p>

      {deviceSeen ? (
        <button
          type="button"
          className="hv2-button hv2-button--primary hv2-press hv2-connect-cta"
          onClick={() => {
            setDemo({ enabled: false })
            notify({ message: COPY.demo.seeMineToast })
          }}
        >
          {COPY.demo.seeMine}
          <ArrowRight aria-hidden className="size-4" />
        </button>
      ) : (
        <>
          <div className="hv2-connect-block">
            <h3 className="hv2-eyebrow">{copy.realTitle}</h3>
            <ul className="hv2-connect-items">
              {copy.items.map((item) => {
                const Icon = ITEM_ICON[item.id] ?? Check
                const soon = item.status === "soon"
                return (
                  <li key={item.id} className="hv2-connect-item" data-soon={soon || undefined}>
                    <span aria-hidden className="hv2-connect-item-icon"><Icon className="size-4" /></span>
                    <span className="hv2-connect-item-text">
                      <span className="hv2-connect-item-label">{item.label}</span>
                      <span className="hv2-connect-item-hint">{item.hint}</span>
                    </span>
                    <span className="hv2-connect-chip">{soon ? copy.statusSoon : copy.statusNow}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <ol className="hv2-connect-steps">
            {copy.steps.map((step, index) => (
              <li key={step}>
                <span aria-hidden className="hv2-connect-n">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>

          <Link href={COPY.demo.connectHref} className="hv2-button hv2-button--primary hv2-press hv2-connect-cta">
            {copy.cta}
            <ArrowRight aria-hidden className="size-4" />
          </Link>

          <p className="hv2-connect-waiting" role="status">
            <span aria-hidden className="hv2-connect-radar" />
            <span>
              <strong>{copy.waiting}</strong>
              <span aria-hidden className="hv2-connect-dots"><i /><i /><i /></span>
              {" "}{copy.waitingHint}
            </span>
          </p>
        </>
      )}
      <p className="hv2-caption">{copy.note}</p>
    </Card>
  )
}
