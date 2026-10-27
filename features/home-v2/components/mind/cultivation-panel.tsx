"use client"

import { Sprout } from "lucide-react"
import { useId, useRef, useState, type FormEvent } from "react"

import { cn } from "@/lib/utils"
import { automationEligibility, matchSpecies, matchStage, rangeText } from "@/lib/grow/intelligence"
import { stageLabel } from "@/lib/grow/presentation/stage"
import { useNow } from "@/features/mobile/use-now"
import { useHomeV2 } from "../../data/home-v2-provider"
import { Card, Chip, EmptyState, Skeleton } from "../ui/surface"

type Phase = { kind: "idle" } | { kind: "busy" } | { kind: "error"; message: string }
const ERRORS: Record<number, string> = {
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  409: "Esta cámara ya tiene un cultivo activo.",
  422: "Esos datos no son válidos. Revísalos.",
}

async function post(url: string, body: unknown): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    return { ok: response.ok, message: ERRORS[response.status] ?? "No pude guardarlo ahora. Inténtalo de nuevo." }
  } catch {
    return { ok: false, message: "Sin conexión. Inténtalo de nuevo." }
  }
}

interface Line { id: number; from: "myko" | "me"; text: string }
type Step = "species" | "stage" | "confirm" | "saving"

/**
 * Starting a crop as a short conversation. MYKO asks, the person answers (chips or free text), and NOTHING is
 * registered until the person confirms species and stage. It only offers species that exist in the catalog and never
 * assumes a stage. Corrections go back one step without losing the rest.
 */
function GuidedSetup() {
  const { intelligence, retrySensors, retryCultivation } = useHomeV2()
  const profiles = intelligence?.profiles ?? []
  const nextId = useRef(2)
  const [lines, setLines] = useState<Line[]>([{ id: 1, from: "myko", text: "¿Qué quieres cultivar?" }])
  const [step, setStep] = useState<Step>("species")
  const [profileId, setProfileId] = useState<string | null>(null)
  const [stage, setStage] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const profile = profiles.find(p => p.id === profileId) ?? null

  if (!intelligence) return null
  if (profiles.length === 0) return <Card><EmptyState compact icon={<Sprout className="size-5" />} title="Todavía no hay perfiles de especie" body="Cuando haya uno disponible, MYKO te ayudará a empezar tu cultivo aquí." /></Card>

  const say = (...next: Omit<Line, "id">[]) => setLines(prev => [...prev, ...next.map(l => ({ ...l, id: nextId.current++ }))])
  const askStage = (p: typeof profile) => say({ from: "myko", text: `${p?.displayName}. ¿Ya tienes el sustrato inoculado o todavía lo estás preparando? ¿En qué etapa está?` })

  const chooseSpecies = (id: string, shown?: string) => {
    const p = profiles.find(x => x.id === id)
    if (!p) return
    say({ from: "me", text: shown ?? p.displayName })
    setProfileId(id); setStep("stage"); setError(null); askStage(p)
  }
  const chooseStage = (value: string, shown?: string) => {
    say({ from: "me", text: shown ?? stageLabel(value) })
    setStage(value); setStep("confirm"); setError(null)
    say({ from: "myko", text: `Voy a registrar ${profile?.displayName} en ${stageLabel(value).toLowerCase()}. ${profile?.validation === "sample" ? "Es un perfil de ejemplo, sin validación científica. " : ""}¿Lo confirmas?` })
  }

  const onText = (event: FormEvent) => {
    event.preventDefault()
    const value = text.trim()
    if (!value) return
    setText("")
    if (step === "species") {
      const match = matchSpecies(value, profiles)
      if (match) chooseSpecies(match.id, value)
      else say({ from: "me", text: value }, { from: "myko", text: `Todavía no tengo un perfil para «${value}». Hoy puedo acompañarte con: ${profiles.map(p => p.displayName).join(", ")}.` })
    } else if (step === "stage" && profile) {
      const match = matchStage(value, profile.stages)
      if (match?.kind === "stage") chooseStage(match.stage, value)
      else if (match?.kind === "not_yet") say({ from: "me", text: value }, { from: "myko", text: "Entonces todavía no registro nada. Cuando inocules, vuelve y lo anotamos. Mientras, sigo midiendo tu cámara." })
      else say({ from: "me", text: value }, { from: "myko", text: "No estoy seguro de la etapa. Elige una de las opciones de abajo y la confirmamos." })
    }
  }

  const confirm = async () => {
    if (!profile || !stage) return
    setStep("saving"); setError(null)
    const result = await post("/api/v2/grow/runs", { chamberId: intelligence.chamberId, profileId: profile.id, initialStage: stage, name: "Mi cultivo" })
    if (result.ok) { retrySensors(); retryCultivation() } else { setError(result.message); setStep("confirm") }
  }

  return (
    <Card className="hv2-setup">
      <h2 className="hv2-setup-title">Empecemos tu cultivo</h2>
      <ol className="hv2-chat-thread" aria-live="polite">
        {lines.map(l => <li key={l.id} className={cn("hv2-chat-msg", l.from === "me" ? "is-me" : "is-myko")}><p>{l.text}</p></li>)}
      </ol>
      {step === "species" && (
        <div className="hv2-chat-chips" role="group" aria-label="Especies disponibles">
          {profiles.map(p => <button key={p.id} type="button" className="hv2-filter hv2-press" onClick={() => chooseSpecies(p.id)}>{p.displayName}{p.validation === "sample" ? " (ejemplo)" : ""}</button>)}
        </div>
      )}
      {step === "stage" && profile && (
        <div className="hv2-chat-chips" role="group" aria-label="Etapas">
          {profile.stages.map(s => <button key={s} type="button" className="hv2-filter hv2-press" onClick={() => chooseStage(s)}>{stageLabel(s)}</button>)}
          <button type="button" className="hv2-filter hv2-press" onClick={() => say({ from: "me", text: "Todavía lo estoy preparando" }, { from: "myko", text: "Entonces todavía no registro nada. Cuando inocules, vuelve y lo anotamos. Mientras, sigo midiendo tu cámara." })}>Todavía estoy preparando</button>
          <button type="button" className="hv2-filter hv2-press" onClick={() => { setStep("species"); setProfileId(null); say({ from: "myko", text: "Sin problema. ¿Qué quieres cultivar?" }) }}>Cambiar especie</button>
        </div>
      )}
      {(step === "confirm" || step === "saving") && (
        <div className="hv2-chat-chips" role="group" aria-label="Confirmación">
          <button type="button" className="hv2-button hv2-button--primary hv2-press" disabled={step === "saving"} onClick={() => { void confirm() }}>{step === "saving" ? "Registrando…" : "Sí, registrar"}</button>
          <button type="button" className="hv2-filter hv2-press" disabled={step === "saving"} onClick={() => { setStep("stage"); setStage(null); say({ from: "myko", text: "Corrijamos la etapa. ¿En cuál está?" }) }}>Corregir etapa</button>
          <button type="button" className="hv2-filter hv2-press" disabled={step === "saving"} onClick={() => { setStep("species"); setProfileId(null); setStage(null); say({ from: "myko", text: "Corrijamos la especie. ¿Qué quieres cultivar?" }) }}>Corregir especie</button>
        </div>
      )}
      {error && <p role="alert" className="hv2-setup-error">{error}</p>}
      {(step === "species" || step === "stage") && (
        <form className="hv2-chat-form" onSubmit={onText}>
          <label className="hv2-sr-only" htmlFor="hv2-setup-input">Tu respuesta</label>
          <input id="hv2-setup-input" className="hv2-chat-input" value={text} maxLength={120} placeholder={step === "species" ? "Por ejemplo: hongos ostra" : "Por ejemplo: ya está colonizando"} autoComplete="off" onChange={e => setText(e.target.value)} />
          <button type="submit" className="hv2-chat-send hv2-press" disabled={!text.trim()} aria-label="Enviar">→</button>
        </form>
      )}
      <p className="hv2-caption">No registro nada hasta que lo confirmes, y puedes corregirlo después.</p>
    </Card>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <label className="hv2-field" htmlFor={id}>
      <span className="hv2-field-label">{label}</span>
      <input id={id} className="hv2-select" inputMode="decimal" value={value} onChange={e => onChange(e.target.value.replace(",", "."))} />
    </label>
  )
}

/** Editable, owner-confirmed ranges. Until confirmed they are labelled as the profile's example and block any future automation. */
function TargetsEditor() {
  const { intelligence, retrySensors, retryCultivation } = useHomeV2()
  const cultivation = intelligence?.cultivation
  const t = cultivation?.targets
  const [open, setOpen] = useState(false)
  const [v, setV] = useState({ tmin: String(t?.temperature?.min ?? ""), tmax: String(t?.temperature?.max ?? ""), hmin: String(t?.humidity?.min ?? ""), hmax: String(t?.humidity?.max ?? "") })
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  if (!cultivation) return null

  const save = async () => {
    setPhase({ kind: "busy" })
    const body = { temperature: { min: Number(v.tmin), max: Number(v.tmax) }, humidity: { min: Number(v.hmin), max: Number(v.hmax) } }
    const result = await post(`/api/v2/grow/runs/${cultivation.runId}/targets`, body)
    if (result.ok) { setOpen(false); setPhase({ kind: "idle" }); retrySensors(); retryCultivation() } else setPhase({ kind: "error", message: result.message })
  }

  return (
    <div className="hv2-setup-stage">
      <dl className="hv2-setup-facts">
        <div><dt>Temperatura objetivo</dt><dd>{t?.temperature ? rangeText("temperature", t.temperature) : "Sin definir"}</dd></div>
        <div><dt>Humedad objetivo</dt><dd>{t?.humidity ? rangeText("humidity", t.humidity) : "Sin definir"}</dd></div>
      </dl>
      <p className="hv2-caption">
        {cultivation.targetsConfirmed
          ? "Estos rangos los definiste y confirmaste tú."
          : "Son rangos de ejemplo del perfil, sin confirmar. Revísalos y ajústalos: hasta que los confirmes no habrá ninguna automatización."}
      </p>
      {open ? (
        <>
          <div className="hv2-setup-facts">
            <NumberField label="Temp. mínima (°C)" value={v.tmin} onChange={x => setV({ ...v, tmin: x })} />
            <NumberField label="Temp. máxima (°C)" value={v.tmax} onChange={x => setV({ ...v, tmax: x })} />
            <NumberField label="Humedad mínima (%)" value={v.hmin} onChange={x => setV({ ...v, hmin: x })} />
            <NumberField label="Humedad máxima (%)" value={v.hmax} onChange={x => setV({ ...v, hmax: x })} />
          </div>
          {phase.kind === "error" && <p role="alert" className="hv2-setup-error">{phase.message}</p>}
          <div className="hv2-chat-chips">
            <button type="button" className="hv2-button hv2-button--primary hv2-press" disabled={phase.kind === "busy"} onClick={() => { void save() }}>{phase.kind === "busy" ? "Guardando…" : "Confirmar mis rangos"}</button>
            <button type="button" className="hv2-filter hv2-press" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </>
      ) : (
        <button type="button" className="hv2-button hv2-press" onClick={() => setOpen(true)}>{cultivation.targetsConfirmed ? "Editar rangos" : "Revisar y confirmar rangos"}</button>
      )}
    </div>
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
  const others = cultivation.profile.stages.filter(s => s !== cultivation.stage)
  const automation = automationEligibility({ actuatorsInstalled: false, targetsConfirmed: cultivation.targetsConfirmed, validation: cultivation.profile.validation, rangesSource: cultivation.rangesSource })

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
        {cultivation.rangesSource === "owner"
          ? <Chip tone="ok" className="hv2-chip--caps">Rangos tuyos</Chip>
          : cultivation.profile.validation === "sample" && <Chip tone="watch" className="hv2-chip--caps">Perfil de ejemplo</Chip>}
      </div>
      <dl className="hv2-setup-facts">
        <div><dt>Etapa</dt><dd>{stageLabel(cultivation.stage)}</dd></div>
        <div><dt>Inicio</dt><dd>{new Date(cultivation.startedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}{day ? ` · día ${day}` : ""}</dd></div>
      </dl>
      <TargetsEditor key={`${cultivation.runId}:${cultivation.stage}:${cultivation.targetsConfirmed}`} />
      {others.length > 0 && (
        <div className="hv2-setup-stage">
          <label className="hv2-field" htmlFor={stageId}>
            <span className="hv2-field-label">Corregir o cambiar la etapa (tú lo confirmas)</span>
            <select id={stageId} className="hv2-select" value={next} onChange={e => setNext(e.target.value)}>
              <option value="">Elige la etapa</option>
              {others.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
            </select>
          </label>
          {phase.kind === "error" && <p role="alert" className="hv2-setup-error">{phase.message}</p>}
          <button type="button" className="hv2-button hv2-press" disabled={!next || phase.kind === "busy"} onClick={() => { void confirm() }}>
            {phase.kind === "busy" ? "Guardando…" : "Confirmar etapa"}
          </button>
        </div>
      )}
      <div className="hv2-setup-note">
        <p className="hv2-setup-note-title">Automatización: no disponible</p>
        <ul>{automation.reasons.map(r => <li key={r}>{r}</li>)}</ul>
      </div>
    </Card>
  )
}

/** Mi cultivo (real data): start one by talking to MYKO, or review and correct what is registered. */
export function CultivationPanel() {
  const { intelligence, cloudStatus } = useHomeV2()
  if (!intelligence) {
    return cloudStatus === "loading" ? <Card aria-busy="true"><Skeleton className="hv2-mind-skeleton" /></Card>
      : <Card><EmptyState compact icon={<Sprout className="size-5" />} title="Primero conecta tu dispositivo" body="Cuando MYKO-001 esté asociado a tu cuenta podrás configurar el cultivo aquí." /></Card>
  }
  return intelligence.cultivation ? <ActiveCultivation /> : <GuidedSetup />
}
