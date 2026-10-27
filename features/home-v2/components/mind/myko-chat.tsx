"use client"

import Link from "next/link"
import { ArrowUp, Sparkles } from "lucide-react"
import { useRef, useState, type FormEvent } from "react"

import { cn } from "@/lib/utils"
import { SUGGESTIONS, answerIntent, classifyIntent, respondWithRules, type AssistantAnswer, type Intent } from "@/lib/grow/intelligence"
import { publishControl } from "../../data/control-client"
import { useHomeV2 } from "../../data/home-v2-provider"
import { Card } from "../ui/surface"

interface Message { id: number; from: "me" | "myko"; text: string; answer?: AssistantAnswer; proposalState?: "open" | "saving" | "saved" | "cancelled" }

const SOURCE_LABEL: Record<AssistantAnswer["source"], string> = { rules: "Reglas con tus datos", model: "IA · revisada con reglas de seguridad" }

/**
 * Talk to MYKO. Known questions are answered on the spot by deterministic rules over the person's real readings;
 * only free text the rules cannot place is sent to the server, where a model answers IF one is configured (it is
 * not today). Every answer says where it came from.
 */
export function MykoChat() {
  const { intelligence, retrySensors } = useHomeV2()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const nextId = useRef(1)
  if (!intelligence) return null
  const context = intelligence.context

  const push = (m: Omit<Message, "id">) => setMessages(prev => [...prev, { ...m, id: nextId.current++ }].slice(-6))
  const mark = (id: number, proposalState: Message["proposalState"]) => setMessages(prev => prev.map(m => (m.id === id ? { ...m, proposalState } : m)))

  /** Only after the person confirms the exact values shown in the message. Saving is not applying: the device must confirm. */
  const confirmProposal = async (message: Message) => {
    const proposal = message.answer?.proposal
    if (!proposal) return
    mark(message.id, "saving")
    const result = await publishControl({ mode: proposal.mode, targets: proposal.targets })
    if (result.ok) {
      mark(message.id, "saved")
      push({ from: "myko", text: `Guardado como versión ${result.version} (prueba). Todavía no está aplicado: MYKO-001 tiene que recibirlo y confirmarlo. Lo verás en la tarjeta «Objetivo de la cámara».` })
      retrySensors()
    } else {
      mark(message.id, "open")
      push({ from: "myko", text: result.message })
    }
  }

  const ask = async (question: string, intent?: Intent) => {
    const clean = question.trim()
    if (!clean || busy) return
    push({ from: "me", text: clean })
    setText("")
    const local = intent ? answerIntent(intent, context) : respondWithRules(clean, context)
    if (local.understood || classifyIntent(clean) !== "unknown") { push({ from: "myko", text: local.text, answer: local, proposalState: local.proposal ? "open" : undefined }); return }
    setBusy(true)
    try {
      const turns = messages.slice(-4).map(m => ({ role: m.from === "me" ? "user" as const : "assistant" as const, text: m.text }))
      const response = await fetch("/api/v2/assistant", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: clean, turns }) })
      const body = (await response.json()) as { answer?: AssistantAnswer }
      const answer = response.ok && body.answer ? body.answer : local
      push({ from: "myko", text: answer.text, answer })
    } catch {
      push({ from: "myko", text: local.text, answer: local })
    } finally { setBusy(false) }
  }

  const submit = (event: FormEvent) => { event.preventDefault(); void ask(text) }

  return (
    <section aria-labelledby="hv2-chat-h" className="hv2-block">
      <h2 id="hv2-chat-h" className="hv2-section-title">Pregúntale a MYKO</h2>
      <Card className="hv2-chat">
        {messages.length > 0 && (
          <ol className="hv2-chat-thread" aria-live="polite">
            {messages.map(m => (
              <li key={m.id} className={cn("hv2-chat-msg", m.from === "me" ? "is-me" : "is-myko")}>
                <p>{m.text}</p>
                {m.answer && (
                  <span className="hv2-chat-meta"><Sparkles aria-hidden className="size-3" />{SOURCE_LABEL[m.answer.source]}</span>
                )}
                {m.answer?.action && <Link href={m.answer.action.href} className="hv2-button hv2-button--small hv2-press">{m.answer.action.label}</Link>}
                {m.answer?.proposal && m.proposalState !== "saved" && m.proposalState !== "cancelled" && (
                  <div className="hv2-chat-chips" role="group" aria-label="Confirmar cambio de objetivo">
                    <button type="button" className="hv2-button hv2-button--small hv2-button--primary hv2-press" disabled={m.proposalState === "saving"} onClick={() => { void confirmProposal(m) }}>{m.proposalState === "saving" ? "Guardando…" : "Confirmar y guardar"}</button>
                    <button type="button" className="hv2-filter hv2-press" disabled={m.proposalState === "saving"} onClick={() => mark(m.id, "cancelled")}>Cancelar</button>
                  </div>
                )}
              </li>
            ))}
            {busy && <li className="hv2-chat-msg is-myko" aria-busy="true"><p>Pensando…</p></li>}
          </ol>
        )}
        <div className="hv2-chat-chips" role="group" aria-label="Preguntas sugeridas">
          {SUGGESTIONS.map(s => (
            <button key={s.id} type="button" className="hv2-filter hv2-press" onClick={() => { void ask(s.label, s.id) }}>{s.label}</button>
          ))}
        </div>
        <form className="hv2-chat-form" onSubmit={submit}>
          <label className="hv2-sr-only" htmlFor="hv2-chat-input">Escribe tu pregunta a MYKO</label>
          <input id="hv2-chat-input" className="hv2-chat-input" value={text} maxLength={500} placeholder="Escríbele a MYKO…" autoComplete="off" onChange={e => setText(e.target.value)} />
          <button type="submit" className="hv2-chat-send hv2-press" disabled={!text.trim() || busy} aria-label="Enviar"><ArrowUp aria-hidden className="size-5" /></button>
        </form>
        {messages.length === 0 && <p className="hv2-caption">Respondo con tus mediciones reales. Si algo no lo sé, te lo digo.</p>}
      </Card>
    </section>
  )
}
