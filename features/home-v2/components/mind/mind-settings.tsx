"use client"

import Link from "next/link"
import { BellOff, Check, Cpu, Lock } from "lucide-react"

import { cn } from "@/lib/utils"
import { ACTUATOR_READINESS, AUTONOMY_MODES, agoText, automationEligibility, type AutonomyMode } from "@/lib/grow/intelligence"
import { useNow } from "@/features/mobile/use-now"
import { useHomeV2 } from "../../data/home-v2-provider"
import { Card, SectionHeading, ToneDot } from "../ui/surface"

/** MYKO-001: identity, connection and the way to reconnect it. */
export function DeviceSettingsCard() {
  const { device, intelligence } = useHomeV2()
  const now = useNow(10_000)
  const last = intelligence?.report.current?.observedAt
  return (
    <section aria-labelledby="hv2-dev-h" className="hv2-block">
      <SectionHeading id="hv2-dev-h" title="Mi dispositivo" />
      <Card className="hv2-settings-device">
        <span aria-hidden className="hv2-autonomy-icon"><Cpu className="size-5" /></span>
        <div className="hv2-settings-device-main">
          <p className="hv2-autonomy-title">{intelligence?.deviceName ?? device.name ?? "Sin dispositivo"}</p>
          <p className="hv2-caption"><ToneDot tone={device.tone} pulse={device.kind === "live"} /> {device.label}{last && now !== null ? ` · última medición ${agoText(now - Date.parse(last))}` : ""}</p>
        </div>
        <Link href="/home/conectar" className="hv2-section-link hv2-press">Detalles</Link>
      </Card>
    </section>
  )
}

const ORDER: AutonomyMode[] = ["monitor", "assisted", "automatic"]

/** The three ways MYKOSPHARE can work. Only monitoring exists; the others say why they are not available. */
export function ModesCard() {
  const { intelligence } = useHomeV2()
  const crop = intelligence?.cultivation
  const eligibility = automationEligibility({
    actuatorsInstalled: false, targetsConfirmed: crop?.targetsConfirmed ?? false,
    validation: crop?.profile.validation ?? "sample", rangesSource: crop?.rangesSource ?? "profile",
  })
  return (
    <section aria-labelledby="hv2-modes-h" className="hv2-block">
      <SectionHeading id="hv2-modes-h" title="Cómo trabaja MYKOSPHARE" />
      <Card className="hv2-modes">
        <ul className="hv2-modes-list">
          {ORDER.map(id => {
            const mode = AUTONOMY_MODES[id]
            return (
              <li key={id} className={cn("hv2-mode", mode.available && "is-active")} aria-disabled={!mode.available || undefined}>
                <span aria-hidden className="hv2-mode-icon">{mode.available ? <Check className="size-4" /> : <Lock className="size-4" />}</span>
                <div>
                  <p className="hv2-mode-title">{mode.label}{mode.available ? " · activo" : " · no disponible todavía"}</p>
                  <p className="hv2-caption">{mode.description}{mode.unavailableReason ? ` ${mode.unavailableReason}` : ""}</p>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="hv2-setup-note">
          <p className="hv2-setup-note-title">Para llegar al modo Automático falta</p>
          <ul>{eligibility.reasons.map(r => <li key={r}>{r}</li>)}</ul>
        </div>
        <p className="hv2-caption">Acciones automáticas activas: ninguna.</p>
        <details className="hv2-readiness">
          <summary>Pruebas antes de activar actuadores · 0 de {ACTUATOR_READINESS.length}</summary>
          <p className="hv2-caption">Ninguno se enciende hasta que cada punto se pruebe y se registre el resultado medido.</p>
          {(["electrica", "funcional", "operacion"] as const).map(category => (
            <div key={category}>
              <h4 className="hv2-readiness-group">{category === "electrica" ? "Eléctricas" : category === "funcional" ? "Seguridad funcional" : "Operación"}</h4>
              <ol>
                {ACTUATOR_READINESS.filter(g => g.category === category).map(g => (
                  <li key={g.id}><strong>{g.title}.</strong> {g.pass}</li>
                ))}
              </ol>
            </div>
          ))}
        </details>
        <p className="hv2-caption">Cuando haya actuadores, el control lo hará un controlador local con límites, tiempos máximos y estado seguro. La conversación con MYKO nunca enciende nada y tú podrás intervenir siempre.</p>
      </Card>
    </section>
  )
}

export function NotificationsNote() {
  return (
    <section aria-labelledby="hv2-notif-h" className="hv2-block">
      <SectionHeading id="hv2-notif-h" title="Notificaciones" />
      <Card className="hv2-settings-device">
        <span aria-hidden className="hv2-autonomy-icon"><BellOff className="size-5" /></span>
        <p className="hv2-caption">Todavía no envío avisos al teléfono. Verás las alertas aquí, en la campana y en Actividad.</p>
      </Card>
    </section>
  )
}
