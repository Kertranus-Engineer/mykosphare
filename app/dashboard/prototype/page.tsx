"use client"

import { useState } from "react"
import {
  Cpu,
  CircuitBoard,
  Cable,
  Zap,
  Wifi,
  Thermometer,
  Box,
  GraduationCap,
  Building2,
  FlaskConical,
  RadioTower,
  Microscope,
  DollarSign,
  Maximize2,
  X,
  Monitor,
  CheckCircle2,
  Eye,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface GalleryImage {
  src: string
  title: string
  description: string
}

const GALLERY: GalleryImage[] = [
  {
    src: "/images/prototype/esp32-controller.jpg",
    title: "ESP32 Controller",
    description: "Main telemetry and automation controller.",
  },
  {
    src: "/images/prototype/display-interface.jpg",
    title: "LCD Interface",
    description: "Local monitoring and status display.",
  },
  {
    src: "/images/prototype/power-distribution.jpg",
    title: "Power Distribution",
    description: "Terminal blocks and wiring organization.",
  },
  {
    src: "/images/prototype/power-supply.jpg",
    title: "Power Supply",
    description: "12V industrial power source.",
  },
  {
    src: "/images/prototype/voltage-regulation.jpg",
    title: "Voltage Regulation",
    description: "Step-down conversion for low-voltage electronics.",
  },
]

const COST_BREAKDOWN = [
  { label: "ESP32 Controller", cost: "$4", icon: Cpu, color: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "DHT22 Sensor", cost: "$3", icon: Thermometer, color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "LCD Display", cost: "$3", icon: Monitor, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { label: "Power Supply", cost: "$2", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { label: "Enclosure", cost: "$5", icon: Box, color: "text-violet-500", bg: "bg-violet-500/10" },
]

const DEPLOYMENT_CONCEPTS = [
  { icon: GraduationCap, label: "Small Educational Labs", desc: "Students learn IoT, programming and environmental science with real hardware." },
  { icon: Building2, label: "Classrooms", desc: "Affordable monitoring for STEM education and hands-on learning." },
  { icon: FlaskConical, label: "Research Environments", desc: "Precise environmental tracking for experiments and cultures." },
  { icon: RadioTower, label: "Monitoring Stations", desc: "Remote environmental monitoring with real-time cloud connectivity." },
]

const PROTOTYPE_SPECS = [
  {
    icon: Cpu,
    title: "ESP32 Controller",
    description: "Dual-core Xtensa LX6 microprocessor with integrated WiFi 802.11 b/g/n and Bluetooth 4.2. 520 KB SRAM, 4 MB flash. Operates at 240 MHz — more than sufficient for sensor polling and HTTP telemetry transmission.",
    specs: ["ESP32-WROOM-32", "WiFi 802.11 b/g/n", "Bluetooth 4.2 BLE", "240 MHz Dual Core"],
  },
  {
    icon: Thermometer,
    title: "DHT22 Sensor",
    description: "Capacitive humidity sensor and thermistor for measuring ambient air. Provides digital output on a single data pin with 0.5 Hz sampling rate (2-second intervals).",
    specs: ["Temperature: -40°C to 80°C", "Humidity: 0-100% RH", "Accuracy: ±0.5°C / ±2% RH", "Sampling: 0.5 Hz (every 2s)"],
  },
  {
    icon: Cable,
    title: "Wiring",
    description: "Minimal 3-wire connection between sensor and microcontroller. The DHT22 data pin connects to a configurable GPIO, with 3.3V power and ground. A 10kΩ pull-up resistor is recommended on the data line.",
    specs: ["VCC → 3.3V", "GND → GND", "DATA → GPIO 4", "10kΩ pull-up on DATA"],
  },
  {
    icon: Zap,
    title: "Power Supply",
    description: "Powered via USB Micro-B (5V) from any standard USB port, power bank, or wall adapter. The ESP32's onboard voltage regulator provides stable 3.3V to the sensor. Typical consumption is under 0.5W.",
    specs: ["USB Micro-B (5V)", "Consumption: < 0.5W", "Onboard 3.3V regulator", "Works with power bank"],
  },
]

function ImageModal({ image, onClose }: { image: GalleryImage; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[90vh] max-w-[90vw] flex-col gap-3 rounded-xl border border-border/40 bg-card p-4 shadow-[0_0_40px_-10px] shadow-foreground/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{image.title}</h3>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-muted/30 border border-border/20 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.title}
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = "none"
              const parent = target.parentElement
              if (parent) {
                parent.innerHTML = `<div class="flex flex-col items-center gap-2 text-muted-foreground/40"><svg class="size-12" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-xs">Image not available</span><span class="text-[10px]">Add images to public/images/prototype/</span></div>`
              }
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground/70">{image.description}</p>
      </div>
    </div>
  )
}

export default function PrototypePage() {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* ── Header ────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Prototype</h1>
        </div>
        <p className="text-sm text-muted-foreground/70 max-w-2xl">
          Real hardware implementation used for telemetry acquisition and platform validation.
        </p>
      </div>

      {/* ── Hero Image ────────────────────────── */}
      <Card className="transition-all duration-300 border-emerald-500/15 shadow-[0_0_20px_-6px] shadow-emerald-500/10 overflow-hidden group">
        <div className="aspect-[3.2/1] relative bg-muted/30 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prototype/prototype-hero.jpg"
            alt="MYKOSPHARE Prototype"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = "none"
              const parent = target.parentElement
              if (parent) {
                const text = document.createElement("div")
                text.className = "flex h-full w-full items-center justify-center text-[10px] text-muted-foreground/30"
                text.textContent = "Add prototype-hero.jpg to public/images/prototype/"
                parent.appendChild(text)
              }
            }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <span className="text-base font-bold text-white/90 tracking-tight">Physical Hardware Prototype</span>
            <p className="text-xs text-white/60 mt-1 max-w-lg">ESP32-based environmental monitoring system with sensors, display and cloud connectivity — built for real-time telemetry acquisition and platform validation.</p>
          </div>
        </div>
      </Card>

      {/* ── System Overview ────────────────────── */}
      <Card className="transition-all duration-300 border-emerald-500/15 shadow-[0_0_16px_-4px] shadow-emerald-500/5 overflow-hidden">
        <div className="bg-muted/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prototype/prototype-overview.jpg"
            alt="System Overview"
            className="w-full rounded-lg object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = "none"
            }}
          />
        </div>
        <CardContent className="py-2.5">
          <p className="text-[11px] text-muted-foreground/60 text-center">
            Complete MYKOSPHARE prototype assembly with all hardware components connected and operational.
          </p>
        </CardContent>
      </Card>

      {/* ── Physical Prototype ────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Microscope className="size-4 text-amber-500" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Physical Prototype</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PROTOTYPE_SPECS.map((spec, i) => (
            <Card
              key={spec.title}
              className={cn(
                "transition-all duration-300 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]",
                "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
                "hover:scale-[1.01]",
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-sm">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <spec.icon className="size-[18px] text-amber-500" />
                  </div>
                  <span className="font-semibold">{spec.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-muted-foreground/75 mb-3">
                  {spec.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {spec.specs.map((s) => (
                    <span key={s} className="rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60 border border-border/20">
                      {s}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Development Hardware ──────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-emerald-500" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Development Hardware</h2>
        </div>
        <Card className="border-emerald-500/10 shadow-[0_0_16px_-4px] shadow-emerald-500/5">
          <CardContent className="py-3">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "ESP32 Development Board",
                "DHT22 Temperature & Humidity Sensor",
                "LCD Status Display",
                "WiFi Telemetry",
                "Cloud Dashboard Integration",
              ].map((item, i) => (
                <div key={item} className="flex items-center gap-2 rounded-md px-2 py-1.5 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: `${i * 60}ms` }}>
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                  <span className="text-[11px] text-foreground/60">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Real Hardware ─────────────────── */}
      <Card className="transition-all duration-300 border-emerald-500/15 shadow-[0_0_16px_-4px] shadow-emerald-500/5 hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10 hover:scale-[1.01]">
        <CardContent className="flex items-start gap-4 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Wifi className="size-5 text-emerald-500" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold tracking-tight text-emerald-400">Real Hardware</span>
            <p className="text-xs leading-relaxed text-muted-foreground/75">
              MYKOSPHARE can operate using real telemetry from physical sensors. When an ESP32 device with a DHT22 sensor is connected and configured, the dashboard automatically detects the hardware and switches to live data mode. Temperature and humidity readings are transmitted every 3 seconds via HTTP POST to the cloud ingestion endpoint, providing genuine environmental intelligence without simulation.
            </p>
            <p className="text-[10px] leading-relaxed text-muted-foreground/50 mt-1">
              No ESP32 detected? The platform automatically falls back to simulated environmental telemetry for demonstration purposes. Connect a real device at any time — live data always takes priority.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Hardware Components ──────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CircuitBoard className="size-4 text-cyan-500" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Hardware Components</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { icon: Cpu, label: "ESP32", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            { icon: Thermometer, label: "DHT22", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
            { icon: Monitor, label: "LCD Display", color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
            { icon: Zap, label: "Power Supply", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
            { icon: Box, label: "Enclosure", color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
          ].map((comp, i) => (
            <div key={comp.label} className={cn("flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 transition-all duration-200 hover:scale-[1.05] opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]", comp.bg, comp.border)} style={{ animationDelay: `${i * 60}ms` }}>
              <comp.icon className={cn("size-5", comp.color)} />
              <span className={cn("text-[10px] font-semibold tracking-wider", comp.color)}>{comp.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gallery ───────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CircuitBoard className="size-4 text-blue-500" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Prototype Gallery</h2>
          <span className="text-[10px] text-muted-foreground/40 ml-auto">{GALLERY.length} images</span>
        </div>
        <p className="text-xs text-muted-foreground/60 -mt-1">
          Real hardware photographs and assembly documentation.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((image, i) => (
            <button
              key={image.title}
              type="button"
              onClick={() => setSelectedImage(image)}
              className={cn(
                "group text-left transition-all duration-300 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]",
                "hover:scale-[1.02]",
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Card className="h-full transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10 overflow-hidden">
                <div className="relative aspect-[16/9] bg-muted/20 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src}
                    alt={image.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                      const parent = target.parentElement
                      if (parent) {
                        const div = document.createElement("div")
                        div.className = "flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground/30"
                        div.innerHTML = `<svg class="size-10" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-[10px]">Add images to public/prototype/</span>`
                        parent.appendChild(div)
                      }
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/30">
                    <div className="flex size-10 items-center justify-center rounded-full bg-background/80 border border-border/50 shadow-lg">
                      <Maximize2 className="size-4 text-foreground/70" />
                    </div>
                  </div>
                </div>
                <CardContent className="py-3">
                  <h3 className="text-sm font-semibold text-foreground">{image.title}</h3>
                  <p className="text-[11px] leading-relaxed text-muted-foreground/60 mt-1">{image.description}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {/* ── Estimated Build Cost Breakdown ──── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="size-4 text-emerald-500" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Estimated Build Cost Breakdown</h2>
        </div>
        <Card className="border-emerald-500/15 shadow-[0_0_20px_-6px] shadow-emerald-500/10 transition-all duration-300 hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10 hover:scale-[1.01]">
          <CardContent className="py-4">
            <div className="flex flex-col gap-2.5">
              {COST_BREAKDOWN.map((item, idx, arr) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", item.bg)}>
                    <item.icon className={cn("size-3.5", item.color)} />
                  </div>
                  <span className="text-xs text-foreground/60 flex-1">{item.label}</span>
                  <div className="w-32 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500/60 transition-all duration-1000"
                      style={{ width: `${((arr.length - idx) / arr.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-emerald-500 w-10 text-right">{item.cost}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/30">
                <span className="text-xs font-semibold text-foreground/70">Total Prototype Cost</span>
                <span className="text-base font-bold text-emerald-500 tabular-nums">~$89 USD</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Deployment Concept ────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-violet-500" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Deployment Concept</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEPLOYMENT_CONCEPTS.map((concept, i) => (
            <Card
              key={concept.label}
              className={cn(
                "transition-all duration-300 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]",
                "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
                "hover:scale-[1.01]",
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CardContent className="flex items-start gap-3 py-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 mt-0.5">
                  <concept.icon className="size-4 text-violet-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-foreground/80">{concept.label}</span>
                  <p className="text-[11px] leading-relaxed text-muted-foreground/60 mt-0.5">{concept.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Future Hardware Expansion ──────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-cyan-500" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Future Hardware Expansion</h2>
        </div>
        <Card className="border-cyan-500/10 shadow-[0_0_16px_-4px] shadow-cyan-500/5">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Additional sensors (CO₂, light, soil moisture)",
                "Remote control modules (relays, actuators)",
                "Camera integration for visual monitoring",
                "Automated environmental control loops",
                "Multi-node mesh deployments",
              ].map((item, i) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-md border border-cyan-500/10 bg-cyan-500/[0.02] px-3 py-2 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="size-1.5 rounded-full bg-cyan-500/60" />
                  <span className="text-[11px] text-foreground/60">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Footer note ───────────────────── */}
      <div className="p-4 rounded-lg bg-card/50 border border-border/30">
        <p className="text-[10px] leading-relaxed text-muted-foreground/50 text-center">
          The MYKOSPHARE prototype demonstrates that professional environmental monitoring can be achieved with affordable, open-source hardware and modern web technologies. All components are widely available and can be assembled in under 30 minutes.
        </p>
      </div>

      {/* ── Image Modal ───────────────────── */}
      {selectedImage && (
        <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  )
}
