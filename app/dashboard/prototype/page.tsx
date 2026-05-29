"use client"

import { useState, useCallback } from "react"
import {
  Cpu, CircuitBoard, Cable, Zap, Wifi, Thermometer, Box,
  GraduationCap, Building2, FlaskConical, RadioTower,
  Microscope, DollarSign, Maximize2, X, Monitor,
  CheckCircle2, Eye, ArrowLeft, ArrowRight, ShieldCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface GalleryImage {
  src: string
  title: string
  description: string
}

const GALLERY: GalleryImage[] = [
  { src: "/images/prototype/esp32-controller.jpg", title: "ESP32 Controller", description: "Main telemetry and automation controller." },
  { src: "/images/prototype/display-interface.jpg", title: "LCD Interface", description: "Local monitoring and status display." },
  { src: "/images/prototype/power-distribution.jpg", title: "Power Distribution", description: "Terminal blocks and wiring organization." },
  { src: "/images/prototype/power-supply.jpg", title: "Power Supply", description: "12V industrial power source." },
  { src: "/images/prototype/voltage-regulation.jpg", title: "Voltage Regulation", description: "Step-down conversion for low-voltage electronics." },
]

const COST_ITEMS = [
  { label: "ESP32", cost: "$12", color: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "DHT22", cost: "$5", color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "LCD Display", cost: "$8", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { label: "Power Supply", cost: "$18", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { label: "Relay Components", cost: "$22", color: "text-purple-500", bg: "bg-purple-500/10" },
  { label: "Enclosure + Wiring", cost: "$24", color: "text-violet-500", bg: "bg-violet-500/10" },
]

const BUILD_PHASES = [
  { phase: "Phase 1", label: "ESP32 controller integration" },
  { phase: "Phase 2", label: "Environmental sensing validation" },
  { phase: "Phase 3", label: "LCD monitoring interface" },
  { phase: "Phase 4", label: "Power distribution assembly" },
  { phase: "Phase 5", label: "Cloud telemetry integration" },
  { phase: "Phase 6", label: "MYKOSPHARE platform deployment" },
]

const COMPONENTS = [
  { icon: Cpu, label: "ESP32", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { icon: Thermometer, label: "DHT22", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { icon: Monitor, label: "LCD", color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { icon: Zap, label: "Power", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  { icon: Box, label: "Enclosure", color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
]

const VALIDATION_ITEMS = [
  "5 Hardware Modules", "ESP32 Controller", "Environmental Telemetry",
  "LCD Status Interface", "Industrial Power Supply", "Cloud Integration Ready", "Deployment Ready",
]

const DEPLOYMENT_CONCEPTS = [
  { icon: GraduationCap, label: "Small Educational Labs", desc: "Students learn IoT, programming and environmental science with real hardware." },
  { icon: Building2, label: "Classrooms", desc: "Affordable monitoring for STEM education and hands-on learning." },
  { icon: FlaskConical, label: "Research Environments", desc: "Precise environmental tracking for experiments and cultures." },
  { icon: RadioTower, label: "Monitoring Stations", desc: "Remote environmental monitoring with real-time cloud connectivity." },
]

function ImageModal({ image, images, index, onClose, onPrev, onNext }: {
  image: GalleryImage; images: GalleryImage[]; index: number
  onClose: () => void; onPrev: () => void; onNext: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[92vh] max-w-[92vw] flex-col gap-3 rounded-xl border border-border/40 bg-card p-4 shadow-[0_0_60px_-15px] shadow-foreground/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div><h3 className="text-sm font-semibold text-foreground">{image.title}</h3><span className="text-[9px] text-muted-foreground/40">{index + 1} / {images.length}</span></div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><X className="size-4" /></button>
        </div>
        <div className="relative flex aspect-[16/10] items-center justify-center rounded-lg bg-muted/30 border border-border/20 overflow-hidden min-h-[300px]">
          {index > 0 && (
            <button onClick={onPrev} className="absolute left-2 z-20 flex size-9 items-center justify-center rounded-full bg-background/80 border border-border/40 text-foreground/70 hover:text-foreground transition-colors shadow-lg"><ArrowLeft className="size-4" /></button>
          )}
          {index < images.length - 1 && (
            <button onClick={onNext} className="absolute right-2 z-20 flex size-9 items-center justify-center rounded-full bg-background/80 border border-border/40 text-foreground/70 hover:text-foreground transition-colors shadow-lg"><ArrowRight className="size-4" /></button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.src} alt={image.title} className="max-h-full max-w-full object-contain"
            onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = "none"; const p = t.parentElement; if (p) { const d = document.createElement("div"); d.className = "flex flex-col items-center gap-2 text-muted-foreground/40 p-8"; d.innerHTML = `<svg class="size-16" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-xs">Image not available</span><span class="text-[10px]">Add to public/images/prototype/</span>`; p.appendChild(d); } }} />
        </div>
        <p className="text-xs text-muted-foreground/70">{image.description}</p>
      </div>
    </div>
  )
}

export default function PrototypePage() {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const openImage = useCallback((img: GalleryImage, idx: number) => { setSelectedImage(img); setSelectedIndex(idx) }, [])
  const closeImage = useCallback(() => setSelectedImage(null), [])
  const prevImage = useCallback(() => { if (!selectedImage) return; const i = selectedIndex > 0 ? selectedIndex - 1 : GALLERY.length - 1; setSelectedImage(GALLERY[i]); setSelectedIndex(i) }, [selectedImage, selectedIndex])
  const nextImage = useCallback(() => { if (!selectedImage) return; const i = selectedIndex < GALLERY.length - 1 ? selectedIndex + 1 : 0; setSelectedImage(GALLERY[i]); setSelectedIndex(i) }, [selectedImage, selectedIndex])

  return (
    <div className="flex flex-col gap-3 p-6">
      {/* ── Header + Deployment Status ──────────── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="lg:col-span-3 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Prototype</h1>
          </div>
          <p className="text-sm text-muted-foreground/70">Real hardware implementation used for telemetry acquisition and platform validation.</p>
        </div>
        <Card size="sm" className="border-emerald-500/10 shadow-[0_0_12px_-4px] shadow-emerald-500/5">
          <CardContent className="py-1.5 px-3">
            <span className="text-[9px] font-semibold tracking-[0.1em] text-emerald-500/60 uppercase block mb-1">Deployment Status</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
              {[{ label: "Hardware", value: "Ready" }, { label: "Software", value: "Ready" }, { label: "Telemetry", value: "Active" }, { label: "Cloud", value: "Connected" }, { label: "Prototype", value: "Validated" }].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="size-1 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground/50">{item.label}:</span>
                  <span className="font-medium text-emerald-500">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 pt-1 border-t border-border/20 flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-medium text-emerald-500/70">Ready for Field Testing</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Hardware Components ─────────────────── */}
      <div className="grid grid-cols-5 gap-2">
        {COMPONENTS.map((comp, i) => (
          <div key={comp.label} className={cn("flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-all duration-200 hover:scale-[1.05]", comp.bg, comp.border)} style={{ animationDelay: `${i * 60}ms` }}>
            <comp.icon className={cn("size-5", comp.color)} />
            <span className={cn("text-[10px] font-semibold tracking-wider", comp.color)}>{comp.label}</span>
            <span className="text-[7px] font-medium text-emerald-500/60 uppercase tracking-wider">Deployed</span>
          </div>
        ))}
      </div>

      {/* ── Prototype Gallery ───────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CircuitBoard className="size-4 text-blue-500" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Prototype Gallery</h2>
          <span className="text-[9px] text-muted-foreground/40 ml-auto">{GALLERY.length} images</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {GALLERY.map((image, i) => (
            <button key={image.title} type="button" onClick={() => openImage(image, i)}
              className="group text-left transition-all duration-200 hover:scale-[1.02]"
              style={{ animationDelay: `${i * 60}ms` }}>
              <Card className="h-full overflow-hidden border-border/40 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
                <div className="relative aspect-[4/3] bg-muted/20 overflow-hidden">
                  <div className="absolute top-1.5 left-1.5 z-10 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5">
                    <span className="text-[7px] font-semibold text-emerald-500 uppercase tracking-wider">Deployed</span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.src} alt={image.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = "none"; const p = t.parentElement; if (p) { const d = document.createElement("div"); d.className = "flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground/30"; d.innerHTML = `<svg class="size-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-[9px]">Placeholder</span>`; p.appendChild(d); }}} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/20">
                    <Maximize2 className="size-5 text-foreground/60" />
                  </div>
                </div>
                <CardContent className="py-2 px-2.5">
                  <h3 className="text-xs font-semibold text-foreground">{image.title}</h3>
                  <p className="text-[9px] leading-relaxed text-muted-foreground/50 mt-0.5">{image.description}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {/* ── Prototype Validation ────────────────── */}
      <Card size="sm" className="border-emerald-500/10 shadow-[0_0_12px_-4px] shadow-emerald-500/5 hover:scale-[1.01] transition-all duration-200">
        <CardContent className="flex items-center gap-3 py-2">
          <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
          <span className="text-xs font-semibold tracking-tight text-emerald-400">Prototype Validation</span>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {VALIDATION_ITEMS.map((item) => (
              <span key={item} className="flex items-center gap-1 rounded-md bg-emerald-500/5 border border-emerald-500/15 px-2 py-0.5">
                <CheckCircle2 className="size-3 text-emerald-500" />
                <span className="text-[10px] text-foreground/60">{item}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Featured Deployment ─────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><Microscope className="size-4 text-amber-500" /><h2 className="text-sm font-semibold tracking-tight text-foreground">Featured Deployment</h2></div>
        <Card className="overflow-hidden border-emerald-500/15 shadow-[0_0_16px_-4px] shadow-emerald-500/5 group">
          <div className="aspect-[3/1] relative bg-muted/30 overflow-hidden max-h-[420px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/prototype/prototype-hero.jpg" alt="MYKOSPHARE Prototype"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = "none" }} />
            <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/40" />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <span className="text-sm font-bold text-white/90 tracking-tight">Integrated Prototype System</span>
              <p className="text-[11px] text-white/60 mt-0.5 max-w-lg">Used for hardware validation and telemetry acquisition.</p>
            </div>
            <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
              {[
                { label: "ESP32", status: "ONLINE" },
                { label: "DHT22", status: "ACTIVE" },
                { label: "LCD", status: "ONLINE" },
                { label: "POWER", status: "STABLE" },
                { label: "CLOUD", status: "READY" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 rounded-md bg-background/70 backdrop-blur-sm border border-white/10 px-2 py-0.5">
                  <div className="size-1 rounded-full bg-emerald-500" />
                  <span className="text-[8px] font-semibold text-white/70">{item.label}</span>
                  <span className="text-[8px] text-emerald-400/80 font-medium">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Build Evolution ─────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><Eye className="size-4 text-emerald-500" /><h2 className="text-sm font-semibold tracking-tight text-foreground">Build Evolution</h2></div>
        <Card className="border-emerald-500/10 shadow-[0_0_12px_-4px] shadow-emerald-500/5">
          <CardContent className="py-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {BUILD_PHASES.map((phase, i) => (
                <div key={phase.phase} className="flex items-start gap-2 rounded-md bg-muted/15 px-2.5 py-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={cn("size-2 rounded-full", i < 4 ? "bg-emerald-500" : i < 5 ? "bg-blue-500" : "bg-amber-500")} />
                    {i < BUILD_PHASES.length - 1 && <div className="w-px h-4 bg-muted-foreground/10" />}
                  </div>
                  <div className="min-w-0"><span className="text-[9px] font-semibold text-emerald-500/70">{phase.phase}</span><p className="text-[10px] text-muted-foreground/60 leading-tight">{phase.label}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Deployment Concepts ─────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><Building2 className="size-4 text-violet-500" /><h2 className="text-sm font-semibold tracking-tight text-foreground">Deployment Concepts</h2></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DEPLOYMENT_CONCEPTS.map((concept, i) => (
            <Card key={concept.label} size="sm" className="transition-all duration-200 hover:scale-[1.01] hover:ring-foreground/20" style={{ animationDelay: `${i * 80}ms` }}>
              <CardContent className="flex items-start gap-2 py-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10 border border-violet-500/20 mt-0.5">
                  <concept.icon className="size-3.5 text-violet-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-foreground/80">{concept.label}</span>
                  <p className="text-[10px] leading-relaxed text-muted-foreground/50 mt-0.5">{concept.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Deployment Cost Analysis ────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><DollarSign className="size-4 text-emerald-500" /><h2 className="text-sm font-semibold tracking-tight text-foreground">Deployment Cost Analysis</h2></div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card className="border-emerald-500/10 shadow-[0_0_16px_-4px] shadow-emerald-500/5 hover:scale-[1.01] transition-all duration-200">
            <CardContent className="py-3">
              <div className="flex flex-col gap-1.5">
                {COST_ITEMS.map((item, idx) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={cn("flex size-6 shrink-0 items-center justify-center rounded", item.bg)}><span className={cn("text-[10px] font-bold", item.color)}>{item.label === "ESP32" ? "\u25C6" : item.label === "DHT22" ? "\u25CF" : item.label === "LCD Display" ? "\u25A0" : item.label === "Power Supply" ? "\u26A1" : item.label === "Relay Components" ? "\u25C8" : "\u25C6"}</span></div>
                    <span className="text-[11px] text-foreground/60 flex-1">{item.label}</span>
                    <div className="w-24 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${((idx + 1) / COST_ITEMS.length) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums text-emerald-500 w-12 text-right">{item.cost}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1.5 mt-0.5 border-t border-border/30">
                  <span className="text-xs font-semibold text-foreground/70">Total Prototype Cost</span>
                  <span className="text-base font-bold text-emerald-500 tabular-nums">~$89 USD</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-cyan-500/10 bg-cyan-500/[0.02] shadow-[0_0_24px_-8px] shadow-cyan-500/10 hover:scale-[1.01] transition-all duration-200">
            <CardContent className="flex flex-col gap-3 py-4">
              <span className="text-xs font-semibold tracking-tight text-cyan-400 text-center">Estimated Savings vs Commercial Systems</span>
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Prototype</span>
                  <span className="text-lg font-bold text-emerald-500 tabular-nums">$89</span>
                </div>
                <div className="flex items-center justify-center">
                  <div className="h-px w-8 bg-gradient-to-r from-emerald-500/40 to-cyan-500/40" />
                  <span className="text-[9px] text-muted-foreground/30 mx-1">vs</span>
                  <div className="h-px w-8 bg-gradient-to-r from-cyan-500/40 to-red-500/40" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Commercial</span>
                  <span className="text-lg font-bold text-red-500/80 tabular-nums">$1,500+</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 mx-auto">
                <span className="text-[9px] font-semibold text-emerald-500/80 uppercase tracking-wider">Savings</span>
                <span className="text-base font-bold text-emerald-500 tabular-nums">94%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Future Hardware Expansion ──────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><Cpu className="size-4 text-cyan-500" /><h2 className="text-sm font-semibold tracking-tight text-foreground">Future Hardware Expansion</h2></div>
        <Card className="border-cyan-500/10 shadow-[0_0_12px_-4px] shadow-cyan-500/5">
          <CardContent className="py-3">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
              {["Additional sensors (CO\u2082, light, soil moisture)", "Remote control modules (relays, actuators)", "Camera integration for visual monitoring", "Automated environmental control loops", "Multi-node mesh deployments"].map((item, i) => (
                <div key={item} className="flex items-center gap-1.5 rounded-md border border-cyan-500/10 bg-cyan-500/[0.02] px-2.5 py-1.5" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="size-1.5 rounded-full bg-cyan-500/60" />
                  <span className="text-[10px] text-foreground/60">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Image Modal ─────────────────────────── */}
      {selectedImage && (
        <ImageModal image={selectedImage} images={GALLERY} index={selectedIndex} onClose={closeImage} onPrev={prevImage} onNext={nextImage} />
      )}
    </div>
  )
}
