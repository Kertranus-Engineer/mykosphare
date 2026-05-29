"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface WalkthroughStep {
  id: string
  target: string
  title: string
  description: string
}

const STEPS: WalkthroughStep[] = [
  {
    id: "overview",
    target: "Overview",
    title: "Unified Overview",
    description:
      "Centralized view of all environmental metrics, chamber status, and system health. Monitor temperature, humidity, CO\u2082, and energy in real time.",
  },
  {
    id: "topology",
    target: "Topology",
    title: "Topology Visualization",
    description:
      "Graph-based view of your sensor fabric and device interconnections. Inspect signal paths, node health, and data flow across the deployment.",
  },
  {
    id: "intelligence",
    target: "Intelligence",
    title: "Intelligence Layer",
    description:
      "AI-driven analysis layer. Health scores, trend predictions, stability indices, and operational summaries computed from live telemetry.",
  },
  {
    id: "command-center",
    target: "Command Center",
    title: "Command Center",
    description:
      "Execute operational commands, dispatch recovery protocols, and manage environmental adjustments across the chamber network.",
  },
  {
    id: "demo",
    target: "",
    title: "Demo Simulation",
    description:
      "Run a full operational simulation to observe the system\u2019s response to environmental drift, alert cascades, and automated recovery procedures.",
  },
]

interface WalkthroughContextValue {
  active: boolean
  currentStep: number
  totalSteps: number
  step: WalkthroughStep | null
  start: () => void
  next: () => void
  prev: () => void
  skip: () => void
  dismiss: () => void
  isHighlighted: (label: string) => boolean
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null)

const STORAGE_KEY = "mykosphare_walkthrough_dismissed"

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const start = useCallback(() => {
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY)
      if (dismissed === "true") return
    } catch {}
    setActive(true)
    setCurrentStep(0)
  }, [])

  const next = useCallback(() => {
    setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1))
  }, [])

  const prev = useCallback(() => {
    setCurrentStep((p) => Math.max(p - 1, 0))
  }, [])

  const dismiss = useCallback(() => {
    setActive(false)
    try {
      sessionStorage.setItem(STORAGE_KEY, "true")
    } catch {}
  }, [])

  const skip = useCallback(() => {
    dismiss()
  }, [dismiss])

  const isHighlighted = useCallback(
    (label: string) => {
      if (!active) return false
      const step = STEPS[currentStep]
      return step.target === label
    },
    [active, currentStep]
  )

  const value: WalkthroughContextValue = {
    active,
    currentStep,
    totalSteps: STEPS.length,
    step: STEPS[currentStep] ?? null,
    start,
    next,
    prev,
    skip,
    dismiss,
    isHighlighted,
  }

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
    </WalkthroughContext.Provider>
  )
}

export function useWalkthrough(): WalkthroughContextValue {
  const ctx = useContext(WalkthroughContext)
  if (!ctx) throw new Error("useWalkthrough must be used within WalkthroughProvider")
  return ctx
}
