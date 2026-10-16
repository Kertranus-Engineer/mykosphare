"use client"

import Link from "next/link"
import { Check, Cpu, ExternalLink, FlaskConical, LayoutDashboard, SlidersHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { COPY } from "../copy"
import { useFeedback } from "../components/feedback"
import { Card, Rise, SectionHeading } from "../components/ui/surface"
import { DEMO_SCENARIOS, LAB_THEMES } from "../data/lab-request"
import { useHomeV2 } from "../data/home-v2-provider"

const SWATCH: Record<string, string> = { negro: "hv2-swatch--negro", verde: "hv2-swatch--verde", blanco: "hv2-swatch--blanco" }

/**
 * Más: appearance, the explicit demo mode, and links to the other views.
 * The demo mode is a preference only: turning it on never writes anything.
 */
export function MoreScreen() {
  const { theme, setTheme, demo, setDemo } = useHomeV2()
  const { notify } = useFeedback()

  const toggleDemo = () => {
    setDemo({ enabled: !demo.enabled })
    notify({ message: demo.enabled ? COPY.morePage.disabledToast : COPY.morePage.enabledToast })
  }

  return (
    <div className="hv2-stack">
      <Rise i={0}>
        <header className="hv2-page-head">
          <h1 className="hv2-page-title">{COPY.morePage.title}</h1>
          <p className="hv2-page-lead">{COPY.morePage.lead}</p>
        </header>
      </Rise>

      <Rise i={1}>
        <section aria-labelledby="hv2-theme-h" className="hv2-block">
          <SectionHeading id="hv2-theme-h" title={COPY.morePage.themeTitle} />
          <div role="radiogroup" aria-labelledby="hv2-theme-h" className="hv2-theme-grid">
            {LAB_THEMES.map((id) => {
              const active = theme === id
              const copy = COPY.morePage.themes[id]
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
      </Rise>

      <Rise i={2}>
        <section aria-labelledby="hv2-demo-h" className="hv2-block">
          <SectionHeading id="hv2-demo-h" title={COPY.morePage.demoTitle} />
          <Card className="hv2-demo-card">
            <p className="hv2-demo-lead">{COPY.morePage.demoLead}</p>
            <button
              type="button"
              role="switch"
              aria-checked={demo.enabled}
              onClick={toggleDemo}
              className="hv2-toggle-row hv2-press"
              data-on={demo.enabled || undefined}
            >
              <span className="hv2-toggle-main">
                <FlaskConical aria-hidden className="size-5" />
                <span>
                  <span className="hv2-toggle-title">{COPY.morePage.demoSwitch}</span>
                  <span className="hv2-toggle-hint">{demo.enabled ? COPY.morePage.demoOn : COPY.morePage.demoOff}</span>
                </span>
              </span>
              <span aria-hidden className="hv2-switch"><span className="hv2-switch-knob" /></span>
            </button>

            {demo.enabled && (
              <div className="hv2-demo-scenarios">
                <h3 id="hv2-scenario-h" className="hv2-eyebrow">{COPY.morePage.scenarioTitle}</h3>
                <p className="hv2-caption">{COPY.morePage.scenarioHint}</p>
                <div className="hv2-scenario-list" role="group" aria-labelledby="hv2-scenario-h">
                  {DEMO_SCENARIOS.map((scenario) => (
                    <button
                      key={scenario}
                      type="button"
                      aria-pressed={demo.scenario === scenario}
                      onClick={() => setDemo({ enabled: true, scenario })}
                      className="hv2-scenario hv2-press"
                    >
                      {COPY.morePage.scenarios[scenario]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>
      </Rise>

      <Rise i={3}>
        <section aria-labelledby="hv2-views-h" className="hv2-block">
          <SectionHeading id="hv2-views-h" title={COPY.morePage.viewsTitle} />
          <div className="hv2-sheet-links">
            <Link href={COPY.demo.connectHref} className="hv2-link-row hv2-press">
              <Cpu aria-hidden className="size-4" />
              {COPY.connectCard.cta}
            </Link>
            <Link href="/home-v1" className="hv2-link-row hv2-press">
              <ExternalLink aria-hidden className="size-4" />
              {COPY.morePage.current}
            </Link>
            <Link href="/dashboard" className="hv2-link-row hv2-press">
              <LayoutDashboard aria-hidden className="size-4" />
              {COPY.morePage.advanced}
            </Link>
            <Link href="/dashboard/settings" className="hv2-link-row hv2-press">
              <SlidersHorizontal aria-hidden className="size-4" />
              {COPY.morePage.advancedSettings}
            </Link>
          </div>
        </section>
      </Rise>

      <Rise i={4}>
        <Card className="hv2-note">
          <div>
            <p className="hv2-note-title">{COPY.morePage.aboutTitle}</p>
            <p className="hv2-caption">{COPY.morePage.aboutBody}</p>
          </div>
        </Card>
      </Rise>
    </div>
  )
}
