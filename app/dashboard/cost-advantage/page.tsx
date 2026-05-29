"use client"

import {
  DollarSign,
  Cpu,
  Box,
  Lock,
  Wrench,
  Sprout,
  Globe,
  Zap,
  Layers,
  PiggyBank,
  Check,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ComparisonItem {
  label: string
  traditional: string
  mykosphare: string
  traditionalIcon: React.ComponentType<{ className?: string }>
  mykosphareIcon: React.ComponentType<{ className?: string }>
}

const COMPARISON: ComparisonItem[] = [
  {
    label: "Hardware",
    traditional: "Proprietary Hardware",
    mykosphare: "ESP32 Based",
    traditionalIcon: Box,
    mykosphareIcon: Cpu,
  },
  {
    label: "Installation",
    traditional: "Expensive Installation",
    mykosphare: "Rapid Deployment",
    traditionalIcon: Wrench,
    mykosphareIcon: Zap,
  },
  {
    label: "Technology",
    traditional: "Vendor Lock-in",
    mykosphare: "Open Technologies",
    traditionalIcon: Lock,
    mykosphareIcon: Globe,
  },
  {
    label: "Maintenance",
    traditional: "High Maintenance Cost",
    mykosphare: "Scalable Architecture",
    traditionalIcon: DollarSign,
    mykosphareIcon: Layers,
  },
  {
    label: "Hardware Cost",
    traditional: "High Upfront Investment",
    mykosphare: "Low Hardware Cost",
    traditionalIcon: DollarSign,
    mykosphareIcon: PiggyBank,
  },
]

export default function CostAdvantagePage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Cost Advantage
          </h1>
        </div>
        <p className="text-sm text-muted-foreground/70 max-w-2xl">
          MYKOSPHARE leverages affordable ESP32 hardware and open technologies, potentially reducing deployment costs compared to traditional proprietary solutions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="transition-all duration-200 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards] border-red-500/10 bg-red-500/[0.02]" style={{ animationDelay: "50ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                <DollarSign className="size-4 text-red-500/70" />
              </div>
              <span>Traditional Monitoring Systems</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2.5">
              {COMPARISON.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-md bg-muted/20 px-3 py-2.5 border border-border/20">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded bg-red-500/10">
                    <X className="size-3.5 text-red-500/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-foreground/60 font-medium">{item.traditional}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards] border-emerald-500/15 bg-emerald-500/[0.02]" style={{ animationDelay: "150ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Sprout className="size-4 text-emerald-500" />
              </div>
              <span>MYKOSPHARE</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2.5">
              {COMPARISON.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-md bg-emerald-500/5 px-3 py-2.5 border border-emerald-500/15">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded bg-emerald-500/10">
                    <Check className="size-3.5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-foreground/70 font-medium">{item.mykosphare}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="transition-all duration-200 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards] hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10" style={{ animationDelay: "250ms" }}>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Sprout className="size-6 text-emerald-500" />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground/75 text-center sm:text-left">
            By using open-source software, affordable ESP32 microcontrollers and standard environmental sensors, MYKOSPHARE eliminates the high licensing fees, proprietary hardware costs and vendor lock-in typically associated with industrial monitoring solutions. The platform is designed to be accessible for educational institutions, small-scale agricultural operations and research laboratories with limited budgets.
          </p>
        </CardContent>
      </Card>

      {/* ── Prototype Cost Breakdown ──────────── */}
      <Card className="transition-all duration-200 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards] border-emerald-500/15 shadow-[0_0_20px_-6px] shadow-emerald-500/10" style={{ animationDelay: "320ms" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <PiggyBank className="size-4 text-emerald-500" />
            </div>
            <span>Prototype Cost Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {[
              { label: "ESP32 Controller", cost: "$4" },
              { label: "Temperature/Humidity Sensor", cost: "$3" },
              { label: "Power Supply", cost: "$2" },

              { label: "Enclosure", cost: "$5" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-[11px] text-foreground/60 flex-1">{item.label}</span>
                <span className="text-[11px] font-semibold tabular-nums text-emerald-500">{item.cost}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/30">
              <span className="text-xs font-semibold text-foreground/70">Total Prototype Cost</span>
              <span className="text-sm font-bold text-emerald-500 tabular-nums">~$89 USD</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Estimated Savings ──────────────────── */}
      <Card className="transition-all duration-200 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards] border-cyan-500/15 bg-cyan-500/[0.02] shadow-[0_0_30px_-8px] shadow-cyan-500/15" style={{ animationDelay: "420ms" }}>
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="text-sm font-semibold tracking-tight text-cyan-400">Estimated Savings</h3>
            <div className="grid grid-cols-3 gap-4 w-full max-w-md mx-auto">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Traditional</span>
                <span className="text-lg font-bold text-red-500/80 tabular-nums">$1,000+</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="h-0.5 w-6 bg-gradient-to-r from-red-500/40 to-emerald-500/40" />
                <span className="text-[9px] text-muted-foreground/30 mx-1">vs</span>
                <div className="h-0.5 w-6 bg-gradient-to-r from-emerald-500/40 to-cyan-500/40" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">MYKOSPHARE</span>
                <span className="text-lg font-bold text-emerald-500 tabular-nums">&lt;$100</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-5 py-2">
              <span className="text-[10px] font-semibold text-cyan-500/80 uppercase tracking-wider">Potential Reduction</span>
              <span className="text-base font-bold text-cyan-400 tabular-nums">90%+</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
