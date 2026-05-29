"use client"

import {
  GraduationCap,
  Leaf,
  Sprout,
  FlaskConical,
  Factory,
  Warehouse,
  Beaker,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AppCard {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  accent: string
  bgAccent: string
  borderAccent: string
}

const APPLICATIONS: AppCard[] = [
  {
    icon: GraduationCap,
    title: "Education",
    description:
      "Students can learn sensor integration, IoT networking and environmental analysis using real operational hardware.",
    accent: "text-blue-500",
    bgAccent: "bg-blue-500/10",
    borderAccent: "border-blue-500/20",
  },
  {
    icon: Leaf,
    title: "Environmental Monitoring",
    description:
      "Continuous tracking of temperature, humidity and air quality for environmental research and conservation projects.",
    accent: "text-emerald-500",
    bgAccent: "bg-emerald-500/10",
    borderAccent: "border-emerald-500/20",
  },
  {
    icon: Sprout,
    title: "Agriculture",
    description:
      "Precision monitoring of growing conditions to optimize crop yield and resource utilization in agricultural operations.",
    accent: "text-green-500",
    bgAccent: "bg-green-500/10",
    borderAccent: "border-green-500/20",
  },
  {
    icon: FlaskConical,
    title: "Research Laboratories",
    description:
      "Maintain precise environmental conditions for experiments, cultures and sensitive biological research.",
    accent: "text-violet-500",
    bgAccent: "bg-violet-500/10",
    borderAccent: "border-violet-500/20",
  },
  {
    icon: Factory,
    title: "Industrial Facilities",
    description:
      "Monitor production environments, storage conditions and compliance with industrial environmental standards.",
    accent: "text-amber-500",
    bgAccent: "bg-amber-500/10",
    borderAccent: "border-amber-500/20",
  },
  {
    icon: Warehouse,
    title: "Smart Greenhouses",
    description:
      "Automated climate control and monitoring for greenhouse operations with remote access and alert systems.",
    accent: "text-teal-500",
    bgAccent: "bg-teal-500/10",
    borderAccent: "border-teal-500/20",
  },
  {
    icon: Beaker,
    title: "Mushroom Cultivation",
    description:
      "Specialized environmental monitoring for mushroom growing chambers requiring precise humidity and temperature control.",
    accent: "text-rose-500",
    bgAccent: "bg-rose-500/10",
    borderAccent: "border-rose-500/20",
  },
]

export default function ApplicationsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Applications
          </h1>
        </div>
        <p className="text-sm text-muted-foreground/70 max-w-2xl">
          MYKOSPHARE adapts to diverse environments and industries. Explore how the platform can be applied across different sectors and use cases.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {APPLICATIONS.map((app, i) => (
          <Card
            key={app.title}
            className={cn(
              "transition-all duration-300 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards] group",
              "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
              "hover:border-foreground/15",
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-sm">
                <div className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-110",
                  app.bgAccent,
                  app.borderAccent,
                )}>
                  <app.icon className={cn("size-5", app.accent)} />
                </div>
                <span className="font-semibold">{app.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-relaxed text-muted-foreground/75">
                {app.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-2 p-4 rounded-lg bg-card/50 border border-border/30 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: "500ms" }}>
        <p className="text-xs leading-relaxed text-muted-foreground/60 text-center">
          Each application leverages the same core platform: affordable ESP32 hardware, open-source software stack, real-time telemetry ingestion, AI-powered analytics, and a professional operational dashboard.
        </p>
      </div>
    </div>
  )
}
