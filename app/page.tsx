import Link from "next/link"
import { ArrowRight, Sprout } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050505]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 animate-ambient bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/[0.12] via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <Sprout className="size-4 text-emerald-500" />
            </div>
            <span className="text-sm font-semibold tracking-[0.15em] text-white/80">
              MYKOSPHARE
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] tracking-wider text-white/25">
            <span>MYK-CH-001</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">v0.1.0</span>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-1.5">
              <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-500/40" />
              <span className="text-[11px] font-medium tracking-widest text-white/40 uppercase">
                Operational · v0.1.0
              </span>
            </div>

            <h1 className="text-4xl font-light tracking-tight text-white sm:text-5xl md:text-6xl">
              Environmental Intelligence Platform
            </h1>

            <div className="mt-10 space-y-2.5">
              {[
                ["Realtime environmental automation", "Continuous sensor-driven chamber regulation"],
                ["Vision-assisted monitoring", "Multi-spectral imaging and computer vision pipeline"],
                ["Intelligent telemetry infrastructure", "Distributed sensor fusion with predictive analytics"],
              ].map(([label, desc]) => (
                <div
                  key={label}
                  className="group mx-auto flex max-w-lg items-center gap-3 rounded-lg border border-transparent px-4 py-2.5 transition-all duration-300 hover:border-white/[0.04] hover:bg-white/[0.02]"
                >
                  <div className="size-1 rounded-full bg-white/20 transition-colors duration-300 group-hover:bg-emerald-500/60" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm text-white/60 transition-colors duration-300 group-hover:text-white/80">
                      {label}
                    </span>
                    <span className="text-[11px] text-white/25 transition-colors duration-300 group-hover:text-white/40">
                      {desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-7 py-3.5 text-xs font-medium tracking-[0.2em] text-white/50 transition-all duration-500 hover:border-emerald-500/25 hover:bg-emerald-500/[0.03] hover:text-emerald-400 hover:shadow-[0_0_30px_-8px] hover:shadow-emerald-500/20 uppercase"
              >
                Enter Operational System
                <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </main>

        <footer className="px-6 py-5 sm:px-10">
          <div className="flex flex-col items-center justify-between gap-1 text-[10px] text-white/15 sm:flex-row">
            <span>NA-East / DC-02</span>
            <span>Industrial Biotech · Environmental Intelligence</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
