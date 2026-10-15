"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check, ExternalLink, Monitor } from "lucide-react"

import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { COPY } from "../../copy"
import { useHomeV2 } from "../../data/home-v2-provider"
import { activeScenario, labHref, LAB_SCENARIOS, LAB_THEMES, scenarioRequest, withDemoPhotos } from "../../data/lab-request"

const SWATCH: Record<string, string> = { negro: "hv2-swatch--negro", verde: "hv2-swatch--verde", blanco: "hv2-swatch--blanco" }

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { theme, setTheme, request } = useHomeV2()
  const pathname = usePathname()
  const current = activeScenario(request)
  const simulating = request.grow.kind === "simulation"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="hv2-sheet max-h-[88dvh] gap-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pr-14">
          <SheetTitle className="hv2-sheet-title">{COPY.settings.title}</SheetTitle>
          <SheetDescription className="hv2-sheet-desc">{COPY.settings.description}</SheetDescription>
        </SheetHeader>

        <div className="hv2-sheet-body">
          <section aria-labelledby="hv2-theme-h" className="hv2-sheet-section">
            <h3 id="hv2-theme-h" className="hv2-eyebrow">{COPY.settings.theme}</h3>
            <div role="radiogroup" aria-labelledby="hv2-theme-h" className="hv2-theme-grid">
              {LAB_THEMES.map((id) => {
                const active = theme === id
                const copy = COPY.settings.themes[id]
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(id)}
                    className={cn("hv2-theme-option hv2-press", active && "is-active")}
                  >
                    <span aria-hidden className={cn("hv2-swatch", SWATCH[id])} />
                    <span className="hv2-theme-label">{copy.label}</span>
                    <span className="hv2-theme-hint">{copy.hint}</span>
                    {active && <Check aria-hidden className="hv2-theme-check size-4" />}
                  </button>
                )
              })}
            </div>
          </section>

          <section aria-labelledby="hv2-lab-h" className="hv2-sheet-section">
            <h3 id="hv2-lab-h" className="hv2-eyebrow">{COPY.settings.scenario}</h3>
            <p className="hv2-sheet-note">{COPY.settings.scenarioHint}</p>
            <div className="hv2-scenario-list" role="group" aria-labelledby="hv2-lab-h">
              {LAB_SCENARIOS.map((scenario) => (
                <Link
                  key={scenario}
                  href={labHref(pathname, scenarioRequest(scenario, request))}
                  aria-current={current === scenario ? "true" : undefined}
                  onClick={() => onOpenChange(false)}
                  className="hv2-scenario hv2-press"
                >
                  {COPY.settings.scenarios[scenario]}
                </Link>
              ))}
            </div>
            <Link
              href={labHref(pathname, withDemoPhotos(request, !request.demoPhotos))}
              aria-disabled={!simulating}
              tabIndex={simulating ? undefined : -1}
              onClick={() => onOpenChange(false)}
              className="hv2-toggle-row hv2-press"
              data-on={request.demoPhotos || undefined}
              data-disabled={!simulating || undefined}
            >
              <span>
                <span className="hv2-toggle-title">{COPY.settings.demoPhotos}</span>
                <span className="hv2-toggle-hint">{COPY.settings.demoPhotosHint}</span>
              </span>
              <span aria-hidden className="hv2-switch"><span className="hv2-switch-knob" /></span>
            </Link>
          </section>

          <div className="hv2-sheet-links">
            <Link href="/home" className="hv2-link-row hv2-press">
              <ExternalLink aria-hidden className="size-4" />
              {COPY.settings.current}
            </Link>
            <Link href="/dashboard" className="hv2-link-row hv2-press">
              <Monitor aria-hidden className="size-4" />
              {COPY.settings.advanced}
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
