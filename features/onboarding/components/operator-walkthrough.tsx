"use client"

import { useEffect } from "react"
import { ChevronLeft, ChevronRight, SkipForward, X } from "lucide-react"
import { useWalkthrough } from "@/lib/walkthrough/walkthrough-context"
import { useLocale } from "@/lib/locales/locale-context"

export function OperatorWalkthrough() {
  const { active, currentStep, totalSteps, step, next, prev, skip, dismiss } =
    useWalkthrough()
  const { t } = useLocale()

  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
      if (e.key === "ArrowRight") next()
      if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [active, dismiss, next, prev])

  if (!active || !step) return null

  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  const stepTitleKey = `walkthrough.step${currentStep + 1}.title`
  const stepDescKey = `walkthrough.step${currentStep + 1}.desc`

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />

      <div className="relative z-10 w-full max-w-lg animate-[fade-in-up_0.4s_ease-out]">
        <div className="rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-border/30 px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-500/50" />
              <span className="text-[10px] font-semibold tracking-[0.15em] text-emerald-500/80">
                {t("walkthrough.title")}
              </span>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="px-5 py-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground/50">
                {String(currentStep + 1).padStart(2, "0")}/{String(totalSteps).padStart(2, "0")}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`h-0.5 w-6 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "bg-emerald-500/80"
                        : i < currentStep
                          ? "bg-emerald-500/30"
                          : "bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
            </div>

            <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
              {t(stepTitleKey)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(stepDescKey)}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border/30 px-5 py-3">
            <button
              type="button"
              onClick={skip}
              className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <SkipForward className="size-3" />
              {t("walkthrough.skip")}
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={prev}
                  className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="size-3" />
                  {t("walkthrough.back")}
                </button>
              )}
              {isLast ? (
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-lg bg-emerald-500/15 px-4 py-1.5 text-[11px] font-semibold text-emerald-500 hover:bg-emerald-500/25 transition-colors"
                >
                  {t("walkthrough.complete")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-4 py-1.5 text-[11px] font-semibold text-emerald-500 hover:bg-emerald-500/25 transition-colors"
                >
                  {t("walkthrough.next")}
                  <ChevronRight className="size-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
