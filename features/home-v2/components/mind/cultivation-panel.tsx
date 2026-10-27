"use client"

import { Sprout } from "lucide-react"
import { useId, useState } from "react"

import { rangeText } from "@/lib/grow/intelligence"
import { stageLabel } from "@/lib/grow/presentation/stage"
import { useNow } from "@/features/mobile/use-now"
import { useHomeV2 } from "../../data/home-v2-provider"
import { Card, Chip, EmptyState, Skeleton } from "../ui/surface"

type Phase = { kind: "idle" } | { kind: "busy" } | { kind: "error"; message: string }
const ERRORS: Record<number, string> = {
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  409: "Esta cámara ya tiene un cultivo activo.",
  422: "Esa etapa no existe en el perfil elegido.",
}

async function post(url: string, body: unknown): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    return { ok: response.ok, message: ERRORS[response.status] ?? "No pude guardarlo ahora. Inténtalo de nuevo." }
  } catch {
    return { ok: false, message: "Sin conexión. Inténtalo de nuevo." }
  }
}

function StartCultivation() {
  const { intelligence, retrySensors, retryCultivation } = useHomeV2()
  const [profileId, setProfileId] = useState("")
  const [stage, setStage] = useState("")
  const [name, setName] = useState("Mi cultivo")
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const nameId = useId()
  const stageId = useId()
  if (!intelligence) return null
  const profiles = intelligence.profiles
  const profile = profiles.find(p => p.id === profileId)

  if (profiles.length === 0) {
    return <Card><EmptyState compact icon={<Sprout className="size-5" />} title="No hay perfiles de especie disponibles" body="Cuando haya un perfil podrás iniciar tu cultivo desde aquí." /></Card>
  }

  const submit = async () => {
    if (!profile || !stage) return
    setPhase({ kind: "busy" })
    const result = await post("/api/v2/grow/runs", { chamberId: intelligence.chamberId, profileId: profile.id, initialStage: stage, name: name.trim() || "Mi cultivo" })
    if (result.ok) { retrySensors(); retryCultivation(); setPhase({ kind: "idle" }) } else setPhase({ kind: "error", message: result.message })
  }

  return (
    <Card className="hv2-setup">
      <h2 className="hv2-setup-title">Configura tu cultivo</h2>
      <p className="hv2-caption">Con la especie y la etapa puedo comparar tus mediciones con un rango objetivo. No adivino la etapa: la eliges tú.</p>
      <div role="radiogroup" aria-label="Especie" className="hv2-setup-profiles">
        {profiles.map(p => (
          <button key={p.id} type="button" role="radio" aria-checked={p.id === profileId} className="hv2-theme-option hv2-press" data-selected={p.id === profileId || undefined}
            onClick={() => { setProfileId(p.id); setStage("") }}>
            <span className="hv2-theme-label">{p.displayName}</span>
            <span className="hv2-theme-hint">{p.species}{p.validation === "sample" ? " · perfil de ejemplo, no validado" : ""}</span>
          </button>
        ))}
      </div>
      <label className="hv2-field" htmlFor={stageId}>
        <span className="hv2-field-label">Etapa actual</span>
        <select id={stageId} className="hv2-select" value={stage} disabled={!profile} onChange={e => setStage(e.target.value)}>
          <option value="" disabled>{profile ? "Elige la etapa" : "Primero elige la especie"}</option>
          {profile?.stages.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
        </select>
      </label>
      <label className="hv2-field" htmlFor={nameId}>
        <span className="hv2-field-label">Nombre</span>
        <input id={nameId} className="hv2-select" value={name} maxLength={80} onChange={e => setName(e.target.value)} />
      </label>
      {phase.kind === "error" && <p role="alert" className="hv2-setup-error">{phase.message}</p>}
      <button type="button" className="hv2-button hv2-button--primary hv2-button--block hv2-press" disabled={!profile || !stage || phase.kind === "busy"} onClick={() => { void submit() }}>
        {phase.kind === "busy" ? "Guardando…" : "Iniciar cultivo"}
      </button>
    </Card>
  )
}

function ActiveCultivation() {
  const { intelligence, retrySensors, retryCultivation } = useHomeV2()
  const now = useNow(60_000)
  const [next, setNext] = useState("")
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const stageId = useId()
  const cultivation = intelligence?.cultivation
  if (!intelligence || !cultivation) return null
  const day = now === null ? null : Math.max(1, Math.floor((now - Date.parse(cultivation.startedAt)) / 86_400_000) + 1)
  const targets = cultivation.targets
  const others = cultivation.profile.stages.filter(s => s !== cultivation.stage)

  const confirm = async () => {
    setPhase({ kind: "busy" })
    const result = await post(`/api/v2/grow/runs/${cultivation.runId}/stage`, { stage: next })
    if (result.ok) { setNext(""); retrySensors(); retryCultivation(); setPhase({ kind: "idle" }) } else setPhase({ kind: "error", message: result.message })
  }

  return (
    <Card className="hv2-setup">
      <div className="hv2-setup-head">
        <div>
          <h2 className="hv2-setup-title">{cultivation.name}</h2>
          <p className="hv2-caption">{cultivation.profile.displayName} · {cultivation.profile.species}</p>
        </div>
        {cultivation.profile.validation === "sample" && <Chip tone="watch" className="hv2-chip--caps">Perfil de ejemplo</Chip>}
      </div>
      <dl className="hv2-setup-facts">
        <div><dt>Etapa</dt><dd>{stageLabel(cultivation.stage)}</dd></div>
        <div><dt>Inicio</dt><dd>{new Date(cultivation.startedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}{day ? ` · día ${day}` : ""}</dd></div>
        <div><dt>Temperatura objetivo</dt><dd>{targets?.temperature ? rangeText("temperature", targets.temperature) : "Sin definir"}</dd></div>
        <div><dt>Humedad objetivo</dt><dd>{targets?.humidity ? rangeText("humidity", targets.humidity) : "Sin definir"}</dd></div>
      </dl>
      {cultivation.profile.validation === "sample" && <p className="hv2-caption">Los rangos de este perfil son una referencia de ejemplo, sin validación científica. Úsalos como guía, no como diagnóstico.</p>}
      {others.length > 0 && (
        <div className="hv2-setup-stage">
          <label className="hv2-field" htmlFor={stageId}>
            <span className="hv2-field-label">Cambiar de etapa (tú lo confirmas)</span>
            <select id={stageId} className="hv2-select" value={next} onChange={e => setNext(e.target.value)}>
              <option value="">Elige la nueva etapa</option>
              {others.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
            </select>
          </label>
          {phase.kind === "error" && <p role="alert" className="hv2-setup-error">{phase.message}</p>}
          <button type="button" className="hv2-button hv2-press" disabled={!next || phase.kind === "busy"} onClick={() => { void confirm() }}>
            {phase.kind === "busy" ? "Guardando…" : "Confirmar etapa"}
          </button>
        </div>
      )}
    </Card>
  )
}

/** Mi cultivo (real data): configure species and stage, or see what is configured. */
export function CultivationPanel() {
  const { intelligence, cloudStatus } = useHomeV2()
  if (!intelligence) {
    return cloudStatus === "loading" ? <Card aria-busy="true"><Skeleton className="hv2-mind-skeleton" /></Card>
      : <Card><EmptyState compact icon={<Sprout className="size-5" />} title="Primero conecta tu dispositivo" body="Cuando MYKO-001 esté asociado a tu cuenta podrás configurar el cultivo aquí." /></Card>
  }
  return intelligence.cultivation ? <ActiveCultivation /> : <StartCultivation />
}
