"use client"

import { useState, useEffect, useCallback, useRef } from "react"

const BOOT_STEPS = [
  { message: "INITIALIZING SENSOR FABRIC", duration: 800 },
  { message: "RESTORING INCIDENT MEMORY", duration: 700 },
  { message: "VERIFYING TOPOLOGY GRAPH", duration: 900 },
  { message: "SYNCING REALTIME CHANNELS", duration: 600 },
  { message: "LOADING OPERATIONAL STATE", duration: 800 },
  { message: "SYSTEM READY", duration: 1200 },
]

const SESSION_KEY = "mykosphare_boot_complete"

export function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(-1)
  const [fadingOut, setFadingOut] = useState(false)
  const [bootSkipped, setBootSkipped] = useState(false)
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    return () => {
      if (fadeRef.current) clearTimeout(fadeRef.current)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const booted = sessionStorage.getItem(SESSION_KEY)
    if (booted === "true") {
      const t = setTimeout(() => setBootSkipped(true), 0)
      onCompleteRef.current()
      return () => clearTimeout(t)
    }
    setVisible(true)
    const t1 = setTimeout(() => setStepIndex(0), 100)
    return () => clearTimeout(t1)
  }, [])

  const advanceStep = useCallback(() => {
    setStepIndex((prev) => {
      const next = prev + 1
      if (next >= BOOT_STEPS.length) {
        setFadingOut(true)
        fadeRef.current = setTimeout(() => {
          sessionStorage.setItem(SESSION_KEY, "true")
          setVisible(false)
          onCompleteRef.current()
        }, 600)
        return prev
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (stepIndex < 0 || stepIndex >= BOOT_STEPS.length) return
    const t = setTimeout(advanceStep, BOOT_STEPS[stepIndex].duration)
    return () => clearTimeout(t)
  }, [stepIndex, advanceStep])

  if (bootSkipped || !visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] transition-opacity duration-700 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex flex-col items-center gap-12">
        <div className="flex items-center gap-3">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/50 animate-pulse" />
          <span className="text-lg font-semibold tracking-[0.25em] text-foreground/80">
            MYKOSPHARE
          </span>
        </div>

        <div className="flex flex-col items-center gap-3 min-h-[80px]">
          {BOOT_STEPS.map((step, i) => (
            <div
              key={step.message}
              className={`transition-all duration-500 ${
                i === stepIndex
                  ? "animate-[boot-fade-in_0.4s_ease-out_forwards]"
                  : i < stepIndex
                    ? "animate-[boot-fade-out_0.3s_ease-in_forwards]"
                    : "opacity-0"
              }`}
            >
              {i === stepIndex && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-emerald-500/80" />
                    <span className="text-xs tracking-[0.2em] text-emerald-500/80 font-mono">
                      {step.message}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div className="size-1 rounded-full bg-emerald-500/60 animate-pulse" style={{ animationDelay: "0ms" }} />
                    <div className="size-1 rounded-full bg-emerald-500/60 animate-pulse" style={{ animationDelay: "200ms" }} />
                    <div className="size-1 rounded-full bg-emerald-500/60 animate-pulse" style={{ animationDelay: "400ms" }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {stepIndex < BOOT_STEPS.length - 1 && (
          <div className="absolute bottom-[-40px] h-[1px] w-48 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        )}
      </div>

      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-[0.03]">
        <div className="absolute inset-y-0 left-1/2 w-px bg-emerald-500 animate-[scan-line_4s_linear_infinite]" />
      </div>
    </div>
  )
}
