"use client"

import {
  Globe,
  Server,
  Cpu,
  Cloud,
  Code2,
  Palette,
  CircuitBoard,
  Box,
  ArrowDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface TechItem {
  name: string
  description?: string
}

interface TechCategory {
  icon: React.ComponentType<{ className?: string }>
  title: string
  accent: string
  bgAccent: string
  borderAccent: string
  items: TechItem[]
}

const STACK: TechCategory[] = [
  {
    icon: Globe,
    title: "Frontend",
    accent: "text-blue-500",
    bgAccent: "bg-blue-500/10",
    borderAccent: "border-blue-500/20",
    items: [
      { name: "Next.js 16", description: "React framework with App Router" },
      { name: "React 19", description: "UI component library" },
      { name: "TypeScript", description: "Type-safe development" },
      { name: "Tailwind CSS v4", description: "Utility-first styling" },
      { name: "shadcn/ui", description: "Component system" },
      { name: "Framer Motion", description: "Animation framework" },
      { name: "Recharts", description: "Data visualization" },
      { name: "Lucide Icons", description: "Icon library" },
    ],
  },
  {
    icon: Server,
    title: "Backend",
    accent: "text-emerald-500",
    bgAccent: "bg-emerald-500/10",
    borderAccent: "border-emerald-500/20",
    items: [
      { name: "Node.js", description: "JavaScript runtime" },
      { name: "Next.js API Routes", description: "Serverless API endpoints" },
      { name: "Supabase", description: "Backend platform (optional)" },
      { name: "In-Memory Telemetry", description: "Real-time data pipeline" },
    ],
  },
  {
    icon: Cpu,
    title: "Hardware",
    accent: "text-amber-500",
    bgAccent: "bg-amber-500/10",
    borderAccent: "border-amber-500/20",
    items: [
      { name: "ESP32", description: "WiFi-enabled microcontroller" },
      { name: "DHT22", description: "Temperature & humidity sensor" },
      { name: "LCD I2C 16x2", description: "Display module" },
      { name: "Arduino Framework", description: "Embedded programming" },
    ],
  },
  {
    icon: Cloud,
    title: "Cloud",
    accent: "text-violet-500",
    bgAccent: "bg-violet-500/10",
    borderAccent: "border-violet-500/20",
    items: [
      { name: "Vercel", description: "Frontend deployment" },
      { name: "Future Cloud Integration", description: "Planned expansion" },
    ],
  },
]

export default function TechnologyStackPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Technology Stack
          </h1>
        </div>
        <p className="text-sm text-muted-foreground/70 max-w-2xl">
          MYKOSPHARE is built with modern, open-source technologies across the full stack — from embedded hardware to cloud deployment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STACK.map((category, i) => (
          <Card
            key={category.title}
            className={cn(
              "transition-all duration-300 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]",
              "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
              category.borderAccent,
              "border",
            )}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <div className={cn("flex size-8 items-center justify-center rounded-lg border", category.bgAccent, category.borderAccent)}>
                  <category.icon className={cn("size-4", category.accent)} />
                </div>
                <span>{category.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {category.items.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-md bg-muted/20 px-3 py-2 border border-border/20 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-semibold", category.accent)}>
                        {item.name}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-2 p-4 rounded-lg bg-card/50 border border-border/30 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: "400ms" }}>
        <p className="text-xs leading-relaxed text-muted-foreground/60 text-center">
          The technology stack was chosen to maximize accessibility, reduce costs and enable rapid iteration. Every component is open-source, well-documented and suitable for both educational and production environments.
        </p>
      </div>

      {/* ── Architecture Flow Diagram ─────────── */}
      <div className="flex flex-col gap-3 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: "500ms" }}>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">System Flow</h2>
        </div>
        <Card className="border-emerald-500/10 shadow-[0_0_16px_-4px] shadow-emerald-500/5">
          <CardContent className="py-4">
            <div className="flex flex-col items-center gap-1">
              {[
                { label: "Frontend", sub: "Next.js · React · TailwindCSS", icon: Globe, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                { label: "API Layer", sub: "API Routes · Telemetry Processing", icon: Server, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                { label: "Cloud Services", sub: "Vercel · Supabase", icon: Cloud, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
                { label: "ESP32 Hardware", sub: "WiFi Microcontroller · Arduino Framework", icon: Cpu, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                { label: "Environmental Sensors", sub: "DHT22 · Temperature & Humidity", icon: CircuitBoard, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
              ].map((layer, idx, arr) => (
                <div key={layer.label} className="flex flex-col items-center w-full max-w-xs">
                  <div className={cn(
                    "w-full rounded-lg border px-4 py-2.5 text-center transition-all duration-200 hover:scale-[1.02]",
                    layer.bg, layer.border,
                  )}>
                    <div className="flex items-center justify-center gap-2 mb-0.5">
                      <layer.icon className={cn("size-3.5", layer.color)} />
                      <span className={cn("text-xs font-semibold tracking-tight", layer.color)}>{layer.label}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 leading-relaxed">{layer.sub}</p>
                  </div>
                  {idx < arr.length - 1 && (
                    <ArrowDown className="size-3 text-emerald-500/30 my-1" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
