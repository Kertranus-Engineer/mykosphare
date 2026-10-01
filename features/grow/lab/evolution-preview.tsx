"use client"

import { useEffect, useRef, useState } from "react"
import type { MykoForm } from "@/lib/grow/types"
import type { MykoMomentPhase } from "../myko/myko-renderer"
import { MykoStage } from "../myko/myko-stage"
import { nextForm, planEvolution, previousForm } from "./evolution"
import { visualFixture } from "./visual-fixtures"

/**
 * Evolution ceremony preview (VISUAL LAB ONLY). Drives the renderer's
 * `moment` phases from a pure plan. Not connected to any cultivation, stage
 * suggestion or event feed.
 */
export function EvolutionPreview({ identity }: { identity: string }) {
  const [form, setForm] = useState<MykoForm>("early")
  const [phase, setPhase] = useState<MykoMomentPhase | null>(null)
  const [lastFrom, setLastFrom] = useState<MykoForm | null>(null)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  useEffect(() => clear, [])

  const play = (from: MykoForm) => {
    const plan = planEvolution(from)
    if (!plan) return
    clear()
    setLastFrom(from)
    setForm(from)
    setPhase("charge")
    const [charge, emerge] = plan.steps
    timers.current.push(setTimeout(() => {
      setForm(emerge.form)
      setPhase("emerge")
    }, charge.durationMs))
    timers.current.push(setTimeout(() => setPhase(null), charge.durationMs + emerge.durationMs))
  }

  const jump = (target: MykoForm | null) => {
    if (!target) return
    clear()
    setPhase(null)
    setForm(target)
  }

  const busy = phase !== null
  return (
    <div className="g-lab-evolve">
      <div className="g-lab-evolve-stage" data-phase={phase ?? "rest"}>
        <MykoStage model={visualFixture(form, "content")} identity={identity} moment={phase} size="hero" label={`evolution preview: ${form}`} />
      </div>
      <p className="g-lab-evolve-status" aria-live="polite">
        {form} · {phase ?? "rest"}
      </p>
      <div className="g-lab-controls">
        <button type="button" className="g-button g-button-ghost" onClick={() => jump(previousForm(form))} disabled={busy || !previousForm(form)}>Previous stage</button>
        <button type="button" className="g-button" data-lab="evolve" onClick={() => play(form)} disabled={busy || !nextForm(form)}>Evolve</button>
        <button type="button" className="g-button g-button-ghost" onClick={() => jump(nextForm(form))} disabled={busy || !nextForm(form)}>Next stage</button>
        <button type="button" className="g-button g-button-ghost" data-lab="replay" onClick={() => lastFrom && play(lastFrom)} disabled={busy || !lastFrom}>Replay</button>
      </div>
    </div>
  )
}
