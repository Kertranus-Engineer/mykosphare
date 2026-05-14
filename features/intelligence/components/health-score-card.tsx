"use client"

import { Heart, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { EnvironmentalHealthScore } from "@/lib/intelligence/types"

const STATUS_META: Record<string, { bar: string; dot: string; pulse: string; label: string }> = {
  optimal: { bar: "bg-emerald-500", dot: "bg-emerald-500", pulse: "shadow-[0_0_8px_2px] shadow-emerald-500/30", label: "All metrics optimal" },
  stable: { bar: "bg-blue-500", dot: "bg-blue-500", pulse: "shadow-[0_0_8px_2px] shadow-blue-500/30", label: "Within acceptable range" },
  degraded: { bar: "bg-amber-500", dot: "bg-amber-500", pulse: "shadow-[0_0_8px_2px] shadow-amber-500/30", label: "Some metrics偏离 target" },
  unstable: { bar: "bg-orange-500", dot: "bg-orange-500", pulse: "shadow-[0_0_8px_2px] shadow-orange-500/30", label: "Multiple metrics out of range" },
  critical: { bar: "bg-red-500", dot: "bg-red-500", pulse: "shadow-[0_0_8px_2px] shadow-red-500/30", label: "Critical conditions detected" },
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 90 ? "#10b981" : score >= 75 ? "#3b82f6" : score >= 55 ? "#f59e0b" : score >= 35 ? "#f97316" : "#ef4444"
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700 ease-out"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.35em"
        className="fill-foreground text-lg font-bold tabular-nums"
      >
        {score}
      </text>
    </svg>
  )
}

function SubScore({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 40 ? "bg-amber-500" : pct >= 20 ? "bg-orange-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[10px] text-muted-foreground/70">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground/60">{value}</span>
    </div>
  )
}

export function HealthScoreCard({ score }: { score: EnvironmentalHealthScore }) {
  const meta = STATUS_META[score.status] ?? STATUS_META.critical
  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Heart className="size-4 text-rose-500" />
          Environmental Health
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={score.score} />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className={cn("size-2 rounded-full", meta.dot, meta.pulse)} />
              <span className="text-sm font-medium text-foreground capitalize">{score.status}</span>
            </div>
            <span className="text-[11px] text-muted-foreground/60">{meta.label}</span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <TrendingDown className="size-2.5 text-red-500/60" />
              <span>variance -{score.variancePenalty}pts</span>
              <TrendingUp className="size-2.5 text-amber-500/60 ml-1" />
              <span>alerts -{score.alertPenalty}pts</span>
            </div>
          </div>
        </div>
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <SubScore label="Temperature" value={score.temperatureScore} max={100} />
          <SubScore label="Humidity" value={score.humidityScore} max={100} />
          <SubScore label="CO\u2082" value={score.co2Score} max={100} />
        </div>
      </CardContent>
    </Card>
  )
}
