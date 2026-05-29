"use client"

import {
  FlaskConical,
  Leaf,
  Share2,
  Cloud,
  Brain,
  GraduationCap,
  Rocket,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Phase {
  icon: React.ComponentType<{ className?: string }>
  phase: string
  label: string
  description: string
  status: "completed" | "active" | "planned"
}

const PHASES: Phase[] = [
  {
    icon: FlaskConical,
    phase: "Phase 1",
    label: "Prototype Development",
    description:
      "Initial hardware prototype with ESP32 microcontroller, DHT22 sensor integration, basic data collection and LCD display output.",
    status: "completed",
  },
  {
    icon: Leaf,
    phase: "Phase 2",
    label: "Environmental Monitoring",
    description:
      "Real-time temperature and humidity monitoring, data logging, basic visualization and threshold-based alert system.",
    status: "completed",
  },
  {
    icon: Share2,
    phase: "Phase 3",
    label: "Multi-node Network",
    description:
      "Support for multiple sensor nodes, network topology visualization, distributed data collection and node health monitoring.",
    status: "active",
  },
  {
    icon: Cloud,
    phase: "Phase 4",
    label: "Cloud Integration",
    description:
      "Cloud-based data storage, remote access capabilities, cross-deployment synchronization and persistent historical records.",
    status: "planned",
  },
  {
    icon: Brain,
    phase: "Phase 5",
    label: "AI Assisted Analytics",
    description:
      "Machine learning models for predictive analysis, anomaly detection, trend forecasting and automated environmental optimization.",
    status: "planned",
  },
  {
    icon: GraduationCap,
    phase: "Phase 6",
    label: "Educational Deployment",
    description:
      "Structured educational curriculum, student-friendly interface, learning modules for IoT, programming and environmental science.",
    status: "planned",
  },
  {
    icon: Rocket,
    phase: "Phase 7",
    label: "Commercial Deployment",
    description:
      "Production-ready platform with enterprise features, SLA-backed reliability, advanced security and commercial support options.",
    status: "planned",
  },
]

const STATUS_STYLES: Record<Phase["status"], { dot: string; bg: string; border: string; badge: string; badgeBg: string }> = {
  completed: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    badge: "text-emerald-600",
    badgeBg: "bg-emerald-500/10",
  },
  active: {
    dot: "bg-blue-500 animate-pulse",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    badge: "text-blue-500",
    badgeBg: "bg-blue-500/10",
  },
  planned: {
    dot: "bg-muted-foreground/30",
    bg: "bg-muted/20",
    border: "border-border/20",
    badge: "text-muted-foreground/50",
    badgeBg: "bg-muted/30",
  },
}

const STATUS_LABELS: Record<Phase["status"], string> = {
  completed: "Completed",
  active: "In Progress",
  planned: "Planned",
}

export default function RoadmapPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Roadmap
          </h1>
        </div>
        <p className="text-sm text-muted-foreground/70 max-w-2xl">
          Development timeline and future milestones for the MYKOSPHARE environmental intelligence platform.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PHASES.map((phase, i) => {
          const styles = STATUS_STYLES[phase.status]
          return (
            <div key={phase.phase} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                  "size-3 rounded-full mt-1.5",
                  styles.dot,
                )} />
                {i < PHASES.length - 1 && (
                  <div className={cn(
                    "w-px flex-1 my-1",
                    phase.status === "completed" ? "bg-emerald-500/30" :
                    phase.status === "active" ? "bg-gradient-to-b from-blue-500/30 to-muted-foreground/10" :
                    "bg-muted-foreground/10",
                  )} />
                )}
              </div>
              <Card
                className={cn(
                  "flex-1 transition-all duration-300 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]",
                  "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
                  styles.bg,
                  styles.border,
                )}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <div className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    styles.border,
                  )}>
                    <phase.icon className={cn(
                      "size-4",
                      phase.status === "completed" ? "text-emerald-500" :
                      phase.status === "active" ? "text-blue-500" :
                      "text-muted-foreground/40",
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono tracking-wide text-muted-foreground/50">{phase.phase}</span>
                      <span className={cn(
                        "text-[8px] font-medium tracking-[0.15em] px-1.5 py-0.5 rounded border",
                        styles.badge,
                        styles.badgeBg,
                        styles.border,
                      )}>
                        {STATUS_LABELS[phase.status]}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground mt-1">
                      {phase.label}
                    </h3>
                    <p className="text-xs leading-relaxed text-muted-foreground/70 mt-1">
                      {phase.description}
                    </p>
                  </div>
                  {phase.status === "completed" && (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <div className="size-1.5 rounded-full bg-emerald-500" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-center justify-center gap-6 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: "600ms" }}>
        {(["completed", "active", "planned"] as Phase["status"][]).map((status) => {
          const styles = STATUS_STYLES[status]
          return (
            <div key={status} className="flex items-center gap-2">
              <div className={cn("size-2 rounded-full", styles.dot)} />
              <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                {STATUS_LABELS[status]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
