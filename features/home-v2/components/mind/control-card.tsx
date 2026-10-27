"use client"

import { Target } from "lucide-react"
import { useId, useState } from "react"

import { cn } from "@/lib/utils"
import { parseTargets } from "@/lib/grow/control/validation"
import { describeTargets } from "@/lib/grow/control/request"
import { modeLabel } from "@/lib/grow/control/status"
import type { ControlMode } from "@/lib/grow/control/types"
import { useHomeV2 } from "../../data/home-v2-provider"
import { publishControl } from "../../data/control-client"
import { Card, Chip, ToneDot } from "../ui/surface"

type Phase = { kind: "idle" } | { kind: "busy" } | { kind: "error"; message: string }

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <label className="hv2-field" htmlFor={id}>
      <span className="hv2-field-label">{label}</span>
      <input id={id} className="hv2-select" inputMode="decimal" value={value} onChange={e => onChange(e.target.value.replace(",", "."))} />
    </label>
  )
}

/**
 * The environmental target of the chamber and what the device says about it. "Aplicado" appears ONLY when MYKO-001
 * itself reported that version as applied; a saved request is shown as saved. Works with no crop: that is the
 * "Modo pruebas — cámara vacía" case, where nothing from mushroom profiles is used.
 */
export function ControlCard() {
  const { intelligence, retrySensors } = useHomeV2()
  const control = intelligence?.control ?? null
  const desired = control?.desired ?? null
  const status = intelligence?.controlStatus
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ControlMode>("simulation")
  const [v, setV] = useState({ tmin: "", tmax: "", hmin: "", hmax: "" })
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  if (!intelligence || !status) return null
  const empty = !intelligence.cultivation

  const parsed = (() => {
    const entry = (min: string, max: string) => (min === "" && max === "" ? undefined : { min: Number(min), max: Number(max) })
    return parseTargets({ ...(entry(v.tmin, v.tmax) ? { temperature: entry(v.tmin, v.tmax) } : {}), ...(entry(v.hmin, v.hmax) ? { humidity: entry(v.hmin, v.hmax) } : {}) })
  })()

  const edit = () => {
    const t = desired?.targets
    setV({ tmin: String(t?.temperature?.min ?? ""), tmax: String(t?.temperature?.max ?? ""), hmin: String(t?.humidity?.min ?? ""), hmax: String(t?.humidity?.max ?? "") })
    setMode(desired?.mode === "observation" ? "observation" : "simulation")
    setPhase({ kind: "idle" })
    setOpen(true)
  }

  const save = async () => {
    if (!parsed.ok) return
    setPhase({ kind: "busy" })
    const result = await publishControl({ mode, targets: parsed.value })
    if (result.ok) { setOpen(false); setPhase({ kind: "idle" }); retrySensors() } else setPhase({ kind: "error", message: result.message })
  }

  return (
    <section aria-labelledby="hv2-ctl-h" className="hv2-block">
      <h2 id="hv2-ctl-h" className="hv2-section-title">Objetivo de la cámara</h2>
      <Card className="hv2-ctl" tone={status.tone === "warn" ? "warn" : undefined}>
        <div className="hv2-ctl-head">
          <span aria-hidden className="hv2-autonomy-icon"><Target className="size-5" /></span>
          <div>
            <p className="hv2-ctl-targets">{desired ? describeTargets(desired.targets) : "Sin objetivo definido"}</p>
            <p className="hv2-caption">{empty ? "Modo pruebas · cámara vacía" : "Cámara con cultivo"}{desired ? ` · ${modeLabel(desired.mode)}` : ""}</p>
          </div>
          {desired && <Chip tone={status.phase === "applied" ? "ok" : status.tone === "warn" ? "warn" : "muted"} className="hv2-chip--caps">{status.phase === "applied" ? "Aplicado" : status.phase === "rejected" ? "Rechazado" : status.phase === "received" ? "Recibido" : "Guardado"}</Chip>}
        </div>
        {desired && (
          <>
            <p className="hv2-ctl-status"><ToneDot tone={status.tone === "ok" ? "ok" : status.tone === "warn" ? "warn" : status.tone === "info" ? "info" : "muted"} />{status.label}</p>
            <p className="hv2-caption">{status.controller}</p>
          </>
        )}
        {!desired && !open && <p className="hv2-caption">Define un objetivo de prueba para comprobar que MYKO-001 lo recibe y lo confirma. No se activa ninguna salida eléctrica.</p>}

        {open ? (
          <div className="hv2-ctl-editor">
            <div role="radiogroup" aria-label="Modo" className="hv2-chat-chips">
              {(["simulation", "observation"] as const).map(m => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} className={cn("hv2-filter hv2-press", mode === m && "is-active")} onClick={() => setMode(m)}>{modeLabel(m)}</button>
              ))}
            </div>
            <div className="hv2-setup-facts">
              <Field label="Temp. mínima (°C)" value={v.tmin} onChange={x => setV({ ...v, tmin: x })} />
              <Field label="Temp. máxima (°C)" value={v.tmax} onChange={x => setV({ ...v, tmax: x })} />
              <Field label="Humedad mínima (%)" value={v.hmin} onChange={x => setV({ ...v, hmin: x })} />
              <Field label="Humedad máxima (%)" value={v.hmax} onChange={x => setV({ ...v, hmax: x })} />
            </div>
            <p className="hv2-caption" role="status">
              {parsed.ok ? `Voy a guardar: ${describeTargets(parsed.value)} · ${modeLabel(mode)}. MYKO-001 tiene que recibirlo y confirmarlo; no se activa ninguna salida.` : parsed.error === "at least one target is required" ? "Escribe al menos un rango." : "Revisa los rangos: deben estar dentro de los límites seguros (temperatura 5–35 °C, humedad 20–98 %)."}
            </p>
            {phase.kind === "error" && <p role="alert" className="hv2-setup-error">{phase.message}</p>}
            <div className="hv2-chat-chips">
              <button type="button" className="hv2-button hv2-button--primary hv2-press" disabled={!parsed.ok || phase.kind === "busy"} onClick={() => { void save() }}>{phase.kind === "busy" ? "Guardando…" : "Confirmar y guardar"}</button>
              <button type="button" className="hv2-filter hv2-press" onClick={() => setOpen(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button type="button" className="hv2-button hv2-press" onClick={edit}>{desired ? "Cambiar objetivo" : "Definir objetivo de prueba"}</button>
        )}
      </Card>
    </section>
  )
}
