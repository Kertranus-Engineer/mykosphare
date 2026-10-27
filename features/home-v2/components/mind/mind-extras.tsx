"use client"

import Link from "next/link"
import { Eye, MessageCircle, Sparkles } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { QUESTIONS, rulesProvider, withUnit, rangeText, type AssistantAnswer, type QuestionId } from "@/lib/grow/intelligence"
import { useHomeV2 } from "../../data/home-v2-provider"
import { SEVERITY_TONE } from "../../data/intelligence-view"
import { Card, SectionHeading } from "../ui/surface"

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })

/** What MYKOSPHARE noticed and why, in plain words. Each item names the measurement that caused it. */
export function MindRecommendations() {
  const { intelligence } = useHomeV2()
  const items = (intelligence?.report.recommendations ?? []).filter(r => r.findingKind !== "needs_configuration" && r.findingKind !== "insufficient_data" && r.severity !== "info")
  if (items.length === 0) return null
  return (
    <section aria-labelledby="hv2-reco-h" className="hv2-block">
      <SectionHeading id="hv2-reco-h" title="Qué revisar" />
      <div className="hv2-reco-list">
        {items.slice(0, 3).map(rec => (
          <Card key={rec.id} className="hv2-reco" tone={SEVERITY_TONE[rec.severity]}>
            <h3 className="hv2-reco-title">{rec.title}</h3>
            <p className="hv2-reco-body">{rec.body}</p>
            <p className="hv2-reco-why">
              Basado en {rec.cause.metric && rec.cause.value != null ? withUnit(rec.cause.metric, rec.cause.value) : "tus mediciones"}
              {rec.cause.target && rec.cause.metric ? ` · objetivo ${rangeText(rec.cause.metric, rec.cause.target)}` : ""}
              {rec.cause.since ? ` · desde las ${hhmm(rec.cause.since)}` : ""}
            </p>
            {rec.proposal && <p className="hv2-reco-note">{rec.proposal.unavailableReason} Tú decides qué hacer.</p>}
          </Card>
        ))}
      </div>
    </section>
  )
}

/** What MYKOSPHARE is doing right now, honestly: it observes. */
export function AutonomyLine() {
  const { intelligence } = useHomeV2()
  if (!intelligence) return null
  return (
    <Card className="hv2-autonomy">
      <span aria-hidden className="hv2-autonomy-icon"><Eye className="size-5" /></span>
      <div>
        <p className="hv2-autonomy-title">MYKOSPHARE está en modo Monitoreo</p>
        <p className="hv2-caption">Observa y registra cada 30 s. Todavía no controla ventiladores, humidificador ni calefactor. <Link href="/home/mas" className="hv2-inline-link">Ver modos</Link></p>
      </div>
    </Card>
  )
}

/**
 * Questions answered from the owner's own readings by deterministic rules. It says so; no model is called and
 * nothing here pretends to be AI. A model provider can later plug into the same context.
 */
export function AssistantCard() {
  const { intelligence } = useHomeV2()
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null)
  if (!intelligence) return null
  const ask = async (id: QuestionId) => setAnswer(await rulesProvider.answer(id, intelligence.context))
  return (
    <section aria-labelledby="hv2-assistant-h" className="hv2-block">
      <SectionHeading id="hv2-assistant-h" title="Pregúntale a MYKO" />
      <Card className="hv2-assistant">
        <div className="hv2-assistant-chips" role="group" aria-label="Preguntas frecuentes">
          {QUESTIONS.map(q => (
            <button key={q.id} type="button" className={cn("hv2-filter hv2-press", answer?.questionId === q.id && "is-active")} aria-pressed={answer?.questionId === q.id} onClick={() => { void ask(q.id) }}>
              {q.label}
            </button>
          ))}
        </div>
        {answer ? (
          <div className="hv2-assistant-answer" role="status" aria-live="polite">
            <MessageCircle aria-hidden className="size-4" />
            <p>{answer.text}</p>
          </div>
        ) : (
          <p className="hv2-caption">Toca una pregunta. Respondo con tus mediciones reales.</p>
        )}
        <p className="hv2-assistant-source"><Sparkles aria-hidden className="size-3" />Respuesta basada en reglas con tus datos. No es un modelo de IA.</p>
      </Card>
    </section>
  )
}
