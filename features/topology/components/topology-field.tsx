"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useUnifiedOperationalState } from "@/lib/unified/use-unified"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"
import { useRealEnvironment } from "@/lib/useEnvironment"
import type { TopologyNode, SignalLink, ConnectionState } from "@/lib/topology/types"

// ── Particle ──────────────────────────────────
interface Particle {
  x: number; y: number; vx: number; vy: number
  radius: number; opacity: number; life: number; maxLife: number; layer: 0 | 1 | 2
}

interface FlowPacket {
  linkId: string
  source: { x: number; y: number }
  target: { x: number; y: number }
  progress: number; speed: number; opacity: number
  color: string; glowColor: string
}

interface PulseEffect {
  x: number; y: number; radius: number; maxRadius: number
  color: string; alpha: number
}

// ── Color helpers ──────────────────────────────
function statusColor(status: string): string {
  switch (status) {
    case "online": return "#10b981"
    case "syncing": return "#3b82f6"
    case "degraded": return "#f59e0b"
    case "warning": return "#f97316"
    case "offline": return "#ef4444"
    default: return "#6b7280"
  }
}

function connStateColor(state: ConnectionState): string {
  switch (state) {
    case "nominal": return "#14b8a6"
    case "warning": return "#f59e0b"
    case "critical": return "#ef4444"
    case "offline": return "#4b5563"
  }
}

function statusGlow(status: string): string {
  switch (status) {
    case "online": return "rgba(16, 185, 129,"
    case "syncing": return "rgba(59, 130, 246,"
    case "degraded": return "rgba(245, 158, 11,"
    case "warning": return "rgba(249, 115, 22,"
    case "offline": return "rgba(239, 68, 68,"
    default: return "rgba(107, 114, 128,"
  }
}

// ── Component ─────────────────────────────────
export function TopologyField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 })
  const particlesRef = useRef<Particle[]>([])
  const flowRef = useRef<FlowPacket[]>([])
  const pulsesRef = useRef<PulseEffect[]>([])
  const timeRef = useRef(0)
  const rafRef = useRef(0)
  const dimsRef = useRef({ w: 800, h: 600 })
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const selectedNodeRef = useRef<TopologyNode | null>(null)

  const state = useUnifiedOperationalState(dims.w, dims.h)
  const rtTel = useRealTimeTelemetry()
  const env = useRealEnvironment()
  const opsStateRef = useRef("STABLE")
  const humidityRef = useRef(0.5)
  const tempRef = useRef(0.5)

  // Sync refs via effect to avoid accessing during render
  useEffect(() => { opsStateRef.current = env.state })
  useEffect(() => { humidityRef.current = rtTel.hum > 0 ? rtTel.hum / 100 : 0.5 })
  useEffect(() => { tempRef.current = rtTel.temp > 0 ? (rtTel.temp - 23) / 5 : 0.5 })

  const graph = state.topologyGraph

  // ── Resize observer ─────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        dimsRef.current = { w: rect.width, h: rect.height }
        setDims({ w: rect.width, h: rect.height })
        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = rect.width * devicePixelRatio
          canvas.height = rect.height * devicePixelRatio
          canvas.style.width = `${rect.width}px`
          canvas.style.height = `${rect.height}px`
        }
      }
    }

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    measure()
    return () => observer.disconnect()
  }, [])

  // ── Mouse parallax + node hover detection ───
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      mouseRef.current.tx = (e.clientX - rect.left) / rect.width
      mouseRef.current.ty = (e.clientY - rect.top) / rect.height
    }
    const onClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (dimsRef.current.w / rect.width)
      const my = (e.clientY - rect.top) * (dimsRef.current.h / rect.height)
      const nodes = graph?.nodes ?? []
      for (const node of nodes) {
        const r = node.nodeType === "chamber" ? 22 : node.nodeType === "cloud" ? 16 : 12
        const dx = node.x - mx
        const dy = node.y - my
        if (dx * dx + dy * dy < r * r) {
          const newNode = selectedNodeRef.current?.id === node.id ? null : node
          selectedNodeRef.current = newNode
          setSelectedNodeId(newNode?.id ?? null)
          return
        }
      }
      selectedNodeRef.current = null
      setSelectedNodeId(null)
    }
    el.addEventListener("mousemove", onMove)
    el.addEventListener("click", onClick)
    return () => {
      el.removeEventListener("mousemove", onMove)
      el.removeEventListener("click", onClick)
    }
  }, [graph])

  // ── Spawn particles ─────────────────────────
  const spawnParticle = useCallback((layer: 0 | 1 | 2): Particle => {
    const { w, h } = dimsRef.current
    const cx = w / 2; const cy = h / 2
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * Math.max(w, h) * 0.8
    return {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      radius: layer === 0 ? 0.5 : layer === 1 ? 1.2 : 0.8,
      opacity: layer === 0 ? 0.15 : layer === 1 ? 0.25 : 0.35,
      life: 0,
      maxLife: 300 + Math.random() * 400,
      layer,
    }
  }, [])

  // ── Animation loop ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const targetParticles: Record<number, number> = { 0: 50, 1: 25, 2: 15 }

    function tick(ts: number) {
      timeRef.current = ts

      const { w, h } = dimsRef.current
      if (w <= 0 || h <= 0) { rafRef.current = requestAnimationFrame(tick); return }

      const mx = mouseRef.current
      mx.x += (mx.tx - mx.x) * 0.03
      mx.y += (mx.ty - mx.y) * 0.03
      const parallaxX = (mx.x - 0.5) * 30
      const parallaxY = (mx.y - 0.5) * 30

      const dpr = devicePixelRatio
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      // ── Ambient background ──────────────────
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
      bgGrad.addColorStop(0, "rgba(16, 185, 129, 0.04)")
      bgGrad.addColorStop(0.4, "rgba(6, 182, 212, 0.02)")
      bgGrad.addColorStop(1, "transparent")
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      // ── Subtle grid ─────────────────
      ctx.strokeStyle = "rgba(100, 116, 139, 0.04)"
      ctx.lineWidth = 0.5
      const step = 40
      for (let x = step; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
      }
      for (let y = step; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }

      // ── Manage particle pools ───────────────
      for (const layer of [0, 1, 2] as const) {
        const pool = particlesRef.current.filter((p) => p.layer === layer)
        while (pool.length < targetParticles[layer]) {
          const p = spawnParticle(layer)
          particlesRef.current.push(p)
          pool.push(p)
        }
      }

      // ── Operational state ───────────────────
      const opsState = opsStateRef.current
      const isCritical = opsState === "CRITICAL"
      const isWarning = opsState === "WARNING"
      const isRecovery = opsState === "RECOVERY"

      const globalAlpha = isCritical ? 0.7 : isWarning ? 0.85 : 1
      const pulseSpeed = isCritical ? 0.005 : isWarning ? 0.004 : 0.002

      // ── Update & draw particles ─────────────
      const cx = w / 2; const cy = h / 2
      for (const p of particlesRef.current) {
        p.life++
        if (p.layer === 0) {
          const dx = cx + parallaxX * 0.5 - p.x
          const dy = cy + parallaxY * 0.5 - p.y
          p.vx += dx * 0.00002
          p.vy += dy * 0.00002
        } else if (p.layer === 2) {
          const dx = cx - p.x
          const dy = cy - p.y
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          p.vx -= (dx / dist) * 0.003
          p.vy -= (dy / dist) * 0.003
        }

        p.vx *= 0.999
        p.vy *= 0.999
        p.x += p.vx + parallaxX * (0.02 * p.layer)
        p.y += p.vy + parallaxY * (0.02 * p.layer)

        if (p.x < -20) p.x = w + 20
        if (p.x > w + 20) p.x = -20
        if (p.y < -20) p.y = h + 20
        if (p.y > h + 20) p.y = -20

        const lifeRatio = p.life / p.maxLife
        const humEffect = p.layer === 1 ? 0.6 + humidityRef.current * 0.4 : 1
        const alpha = p.opacity * (1 - lifeRatio * lifeRatio) * humEffect * globalAlpha

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        if (p.layer === 0) {
          ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`
        } else if (p.layer === 1) {
          ctx.fillStyle = isCritical ? `rgba(239, 68, 68, ${alpha * 0.8})` : `rgba(6, 182, 212, ${alpha})`
        } else {
          ctx.fillStyle = `rgba(167, 139, 250, ${alpha * 0.5})`
        }
        ctx.fill()
      }

      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife)

      // ── Draw connections ─────────────────────
      const nodes = graph?.nodes ?? []
      const links = graph?.links ?? []
      const nodeById = new Map(nodes.map((n) => [n.id, n]))

      // Assign positions for links that have both endpoints
      const drawnLinks: { link: SignalLink; sx: number; sy: number; tx: number; ty: number }[] = []
      for (const link of links) {
        const src = nodeById.get(link.sourceId)
        const tgt = nodeById.get(link.targetId)
        if (!src || !tgt) continue
        drawnLinks.push({ link, sx: src.x, sy: src.y, tx: tgt.x, ty: tgt.y })
      }

      // Draw link lines
      for (const { link, sx, sy, tx, ty } of drawnLinks) {
        const csColor = connStateColor(link.connectionState)
        const isActive = link.active
        const alpha = link.connectionState === "offline" ? 0.15 : link.quality / 200 + 0.08

        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(tx, ty)

        if (isActive && link.connectionState === "nominal") {
          ctx.strokeStyle = csColor + "30)"
          ctx.setLineDash([4, 8])
          ctx.lineWidth = 1
          ctx.stroke()

          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(tx, ty)
          ctx.strokeStyle = csColor + "50)"
          ctx.setLineDash([])
          ctx.lineWidth = 0.5
          ctx.stroke()
        } else if (isActive && link.connectionState === "warning") {
          ctx.strokeStyle = csColor + "40)"
          ctx.setLineDash([3, 6])
          ctx.lineWidth = 1.2
          ctx.stroke()
          ctx.setLineDash([])
        } else if (isActive && link.connectionState === "critical") {
          const flicker = Math.sin(ts * 0.01 + link.id.charCodeAt(0)) * 0.3 + 0.5
          ctx.strokeStyle = csColor + `${Math.round(flicker * 60)})`
          ctx.setLineDash([2, 4])
          ctx.lineWidth = 1.5
          ctx.stroke()
          ctx.setLineDash([])
        } else {
          ctx.strokeStyle = `rgba(75, 85, 99, ${alpha})`
          ctx.setLineDash([2, 10])
          ctx.lineWidth = 0.5
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // ── Packet flow ─────────────────────────
      const activeLinks = drawnLinks.filter((dl) => dl.link.active)

      // Compute packet burst rate based on scenario
      const maxPackets = isCritical ? 40 : isWarning ? 30 : isRecovery ? 25 : 18
      const spawnRate = isCritical ? 0.4 : isWarning ? 0.3 : isRecovery ? 0.25 : 0.12

      if (flowRef.current.length < maxPackets && Math.random() < spawnRate) {
        const dl = activeLinks[Math.floor(Math.random() * activeLinks.length)]
        if (dl) {
          const csColor = connStateColor(dl.link.connectionState)
          flowRef.current.push({
            linkId: dl.link.id,
            source: { x: dl.sx, y: dl.sy },
            target: { x: dl.tx, y: dl.ty },
            progress: 0,
            speed: 0.003 + Math.random() * (isCritical ? 0.012 : 0.006),
            opacity: isCritical ? 0.6 + Math.random() * 0.4 : 0.35 + Math.random() * 0.4,
            color: csColor,
            glowColor: csColor.replace(")", "") + "40)",
          })
        }
      }

      // Draw & update packets
      for (const fp of flowRef.current) {
        fp.progress += fp.speed * (1 + (isCritical ? humidityRef.current * 0.5 : 0))
        const px = fp.source.x + (fp.target.x - fp.source.x) * fp.progress
        const py = fp.source.y + (fp.target.y - fp.source.y) * fp.progress

        // Glow
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fillStyle = fp.glowColor
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(px, py, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = fp.color + Math.round(fp.opacity * 255).toString(16).padStart(2, "0")
        ctx.fill()
      }
      flowRef.current = flowRef.current.filter((fp) => fp.progress < 1)

      // ── Node pulse effects based on scenario ──
      if (isCritical && Math.random() < 0.15) {
        const node = nodes[Math.floor(Math.random() * nodes.length)]
        if (node && node.status !== "offline") {
          pulsesRef.current.push({
            x: node.x, y: node.y,
            radius: 0, maxRadius: 30,
            color: "#ef4444", alpha: 0.5,
          })
        }
      }
      if (isRecovery && Math.random() < 0.08) {
        const node = nodes[Math.floor(Math.random() * nodes.length)]
        if (node && node.status !== "offline") {
          pulsesRef.current.push({
            x: node.x, y: node.y,
            radius: 0, maxRadius: 40,
            color: "#14b8a6", alpha: 0.35,
          })
        }
      }

      // Draw & update pulse effects
      for (const pulse of pulsesRef.current) {
        pulse.radius += 1.2
        pulse.alpha -= 0.008
        if (pulse.alpha > 0 && pulse.radius < pulse.maxRadius) {
          ctx.beginPath()
          ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2)
          ctx.strokeStyle = pulse.color + Math.round(pulse.alpha * 255).toString(16).padStart(2, "0")
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
      pulsesRef.current = pulsesRef.current.filter((p) => p.alpha > 0 && p.radius < p.maxRadius)

      // ── Mycelium Core ───────────────────────
      const coreX = cx + parallaxX * 0.3
      const coreY = cy + parallaxY * 0.3
      const breathe = 1 + Math.sin(ts * pulseSpeed) * (isCritical ? 0.2 : 0.1)

      const coreTint = isCritical ? "239, 68, 68" : isWarning ? "245, 158, 11" : isRecovery ? "20, 184, 166" : "16, 185, 129"

      const auraGrad = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 110 * breathe)
      auraGrad.addColorStop(0, `rgba(${coreTint}, 0.25)`)
      auraGrad.addColorStop(0.4, `rgba(${coreTint}, 0.06)`)
      auraGrad.addColorStop(0.7, `rgba(${coreTint}, 0.015)`)
      ctx.fillStyle = auraGrad
      ctx.beginPath()
      ctx.arc(coreX, coreY, 90 * breathe, 0, Math.PI * 2)
      ctx.fill()

      for (let i = 1; i <= 3; i++) {
        const ringR = 30 + i * 22
        const ringBreathe = 1 + Math.sin(ts * pulseSpeed * 1.5 + i) * 0.08
        ctx.beginPath()
        ctx.arc(coreX, coreY, ringR * ringBreathe, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${coreTint}, ${0.15 / i})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(coreX, coreY, 7 * breathe, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${coreTint}, 0.6)`
      ctx.fill()
      ctx.beginPath()
      ctx.arc(coreX, coreY, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${coreTint}, 0.9)`
      ctx.fill()

      // ── Draw nodes ──────────────────────────
      const selectedId = selectedNodeRef.current?.id

      for (const node of nodes) {
        const px = node.x + parallaxX * (node.nodeType === "chamber" ? 0.1 : 0.2)
        const py = node.y + parallaxY * (node.nodeType === "chamber" ? 0.1 : 0.2)
        const isSelected = selectedId === node.id
        const sColor = statusColor(node.status)
        const sGlow = statusGlow(node.status)

        const breatheBase = 1 + Math.sin(ts * pulseSpeed + node.x * 0.01) * 0.15
        const breatheVal = isCritical
          ? breatheBase + Math.sin(ts * 0.006 + node.y * 0.02) * 0.3
          : isWarning
            ? breatheBase + Math.sin(ts * 0.004 + node.y * 0.02) * 0.2
            : isRecovery
              ? breatheBase + Math.sin(ts * 0.003 + node.y * 0.02) * 0.25
              : breatheBase

        let radius: number
        switch (node.nodeType) {
          case "chamber": radius = 20; break
          case "cloud": case "remote-sync": case "analytics": radius = 12; break
          case "ai-inference": case "predictive": case "broker": case "correlator": radius = 11; break
          case "esp32": radius = 10; break
          case "edge-compute": case "archive": case "failover": case "recovery": radius = 9; break
          case "power": case "simulator": radius = 8; break
          default: radius = 7
        }

        if (isSelected) radius += 3

        const jitterX = isCritical ? Math.sin(ts * 0.01 + node.x * 0.1) * 2 : 0
        const jitterY = isCritical ? Math.cos(ts * 0.012 + node.y * 0.1) * 2 : 0

        const haloColor = isRecovery ? "#14b8a6" : sColor

        // Halo
        const haloGrad = ctx.createRadialGradient(px + jitterX, py + jitterY, radius * 0.5, px + jitterX, py + jitterY, radius * 3 * breatheVal)
        haloGrad.addColorStop(0, sGlow + (isCritical ? "0.7)" : isWarning ? "0.6)" : "0.45)"))
        haloGrad.addColorStop(1, "transparent")
        ctx.fillStyle = haloGrad
        ctx.beginPath()
        ctx.arc(px + jitterX, py + jitterY, radius * 3 * breatheVal, 0, Math.PI * 2)
        ctx.fill()

        // Selection ring
        if (isSelected) {
          ctx.beginPath()
          ctx.arc(px, py, radius + 4, 0, Math.PI * 2)
          ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // Outer ring
        ctx.beginPath()
        ctx.arc(px + jitterX, py + jitterY, radius + 2, 0, Math.PI * 2)
        ctx.strokeStyle = haloColor + "40)"
        ctx.lineWidth = 1
        ctx.stroke()

        // Node body
        ctx.beginPath()
        ctx.arc(px + jitterX, py + jitterY, radius, 0, Math.PI * 2)
        ctx.fillStyle = haloColor
        ctx.globalAlpha = node.status === "offline" ? 0.35 : node.status === "warning" ? 0.7 : 0.9
        ctx.fill()

        // Inner dot
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(px, py, radius * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        ctx.fill()

        // Label
        const fontSize = node.nodeType === "chamber" ? 11 : isSelected ? 9 : 7
        ctx.font = `${fontSize}px 'Geist Mono', monospace`
        const textW = ctx.measureText(node.label).width
        ctx.fillStyle = isSelected
          ? "rgba(255, 255, 255, 0.8)"
          : node.status === "offline"
            ? "rgba(100, 116, 139, 0.25)"
            : "rgba(148, 163, 184, 0.5)"
        ctx.fillText(node.label, px - textW / 2, py + radius + 14)
      }

      // ── Zone labels ──────────────────────────
      const zones = graph?.zones ?? []
      for (const zone of zones) {
        ctx.font = "8px 'Geist Mono', monospace"
        ctx.fillStyle = "rgba(100, 116, 139, 0.3)"
        ctx.textAlign = "center"
        ctx.fillText(zone.label, zone.x + zone.width / 2, zone.y)
        ctx.textAlign = "start"
      }

      // ── Selected node tooltip ────────────────
      const selected = selectedNodeRef.current
      if (selected) {
        const px = selected.x + parallaxX * 0.2
        const py = selected.y + parallaxY * 0.2
        const sColor = statusColor(selected.status)

        // Background card
        const tipW = 220; const tipH = 120
        let tipX = px - tipW / 2
        let tipY = py - tipH - 25
        if (tipX < 5) tipX = 5
        if (tipX + tipW > w - 5) tipX = w - tipW - 5
        if (tipY < 5) tipY = py + 25

        ctx.fillStyle = "rgba(15, 23, 42, 0.92)"
        ctx.strokeStyle = "rgba(100, 116, 139, 0.3)"
        ctx.lineWidth = 1
        roundRect(ctx, tipX, tipY, tipW, tipH, 8)
        ctx.fill()
        ctx.stroke()

        // Content
        ctx.font = "bold 11px 'Geist Mono', monospace"
        ctx.fillStyle = "#e2e8f0"
        ctx.fillText(selected.label, tipX + 12, tipY + 18)

        ctx.font = "9px 'Geist Mono', monospace"
        let lineY = tipY + 36
        const lines = [
          { label: "Health", value: `${selected.health}%`, color: sColor },
          { label: "Uptime", value: `${selected.uptime}s`, color: "#94a3b8" },
          { label: "Telemetry Load", value: selected.telemetryLoad ?? "—", color: "#94a3b8" },
          { label: "Sync State", value: selected.syncState ?? "—", color: "#94a3b8" },
          { label: "Packet Integrity", value: `${selected.packetIntegrity ?? "—"}%`, color: "#94a3b8" },
          { label: "Response Latency", value: `${selected.responseLatency ?? "—"}ms`, color: "#94a3b8" },
        ]

        for (const ln of lines) {
          ctx.fillStyle = "rgba(100, 116, 139, 0.6)"
          ctx.fillText(ln.label, tipX + 12, lineY)
          ctx.fillStyle = ln.color
          ctx.textAlign = "right"
          ctx.fillText(ln.value, tipX + tipW - 12, lineY)
          ctx.textAlign = "start"
          lineY += 14
        }
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [graph, spawnParticle])

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-[500px] min-w-0 overflow-hidden rounded-lg border border-border/50 bg-card"
      style={{ cursor: selectedNodeId ? "pointer" : "default" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  )
}

// Helper: rounded rect path
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}
