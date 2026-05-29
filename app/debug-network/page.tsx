"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import {
  Wifi, WifiOff, CheckCircle, XCircle, Clock, ArrowRight,
  Copy, Send, Server, ShieldAlert, Monitor, ChevronDown, Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────
interface PingResult { ok: boolean; error?: string; latencyMs: number; ts: number }
interface RawResult {
  ok: boolean
  lastPacket: { body: string; headers: Record<string, string>; receivedAt: string } | null
  postCount: number; errorCount: number
  recentPackets: { body: string; headers: Record<string, string>; receivedAt: string }[]
  ts: number
}
interface NetInfo {
  hostname: string; port: string; primaryLAN: string | null; primaryInterface: string | null
  realIPs: string[]; allIPs: string[]; virtualIPs: string[]
  ipChanged: boolean; previousIP: string | null; changeCount: number
  esp32URL: string | null; pingURL: string | null; timestamp: string
}

// ── Helpers ────────────────────────────────────
function formatLatency(ms: number): string {
  if (ms < 1) return "<1ms"
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
function elapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 1000) return `${ms}ms ago`
  if (ms < 60000) return `${Math.round(ms / 1000)}s ago`
  return `${Math.round(ms / 60000)}m ago`
}

// ── Component ──────────────────────────────────
export default function DebugNetworkPage() {
  const [ping, setPing] = useState<PingResult | null>(null)
  const [raw, setRaw] = useState<RawResult | null>(null)
  const [netInfo, setNetInfo] = useState<NetInfo | null>(null)
  const [pingHistory, setPingHistory] = useState<number[]>([])
  const [online, setOnline] = useState(false)
  const [flashPacket, setFlashPacket] = useState(false)
  const [copied, setCopied] = useState(false)
  const [testResult, setTestResult] = useState("")
  const [testRunning, setTestRunning] = useState(false)
  const [noPacketSeconds, setNoPacketSeconds] = useState(0)
  const [ipChanged, setIpChanged] = useState(false)
  const [previousIP, setPreviousIP] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const lastPrimaryRef = useRef<string | null>(null)
  const lastCountRef = useRef(0)

  // Poll network-info every 15s
  useEffect(() => {
    let cancelled = false
    async function fetchNetInfo() {
      try {
        const r = await fetch("/api/network-info")
        const d = await r.json()
        if (cancelled) return
        setNetInfo(d)
        if (lastPrimaryRef.current && d.primaryLAN && d.primaryLAN !== lastPrimaryRef.current) {
          setPreviousIP(lastPrimaryRef.current)
          setIpChanged(true)
        }
        if (d.primaryLAN) lastPrimaryRef.current = d.primaryLAN
      } catch { /* ignore */ }
    }
    fetchNetInfo()
    const niInterval = setInterval(fetchNetInfo, 15000)
    return () => { clearInterval(niInterval); cancelled = true }
  }, [])

  // Tick every 1s: ping + raw poll
  useEffect(() => {
    async function tick() {
      const t0 = performance.now()
      try {
        const res = await fetch("/api/ping")
        await res.json()
        const lat = Math.round(performance.now() - t0)
        setPing({ ok: true, latencyMs: lat, ts: Date.now() })
        setOnline(true)
        setPingHistory((prev) => [...prev.slice(-29), lat])
      } catch (err: unknown) {
        const lat = Math.round(performance.now() - t0)
        setPing({ ok: false, error: err instanceof Error ? err.message : "fetch failed", latencyMs: lat, ts: Date.now() })
        setOnline(false)
      }
      try {
        const res = await fetch("/api/raw")
        const data = await res.json()
        setRaw(data)
        if (data.postCount > lastCountRef.current) {
          lastCountRef.current = data.postCount
          setNoPacketSeconds(0)
          setFlashPacket(true)
          setTimeout(() => setFlashPacket(false), 500)
        } else if (data.postCount === 0) {
          setNoPacketSeconds((prev) => prev + 1)
        }
      } catch { /* ignore */ }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const testRawPost = useCallback(async () => {
    setTestRunning(true); setTestResult("")
    const t0 = performance.now()
    try {
      const res = await fetch("/api/raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, ts: Date.now() }),
      })
      const data = await res.json()
      setTestResult(`OK — HTTP ${res.status} — ${Math.round(performance.now() - t0)}ms — ${JSON.stringify(data)}`)
    } catch (err: unknown) {
      setTestResult(`FAIL — ${err instanceof Error ? err.message : "error"}`)
    }
    setTestRunning(false)
  }, [])

  const copyUrl = useCallback((ip: string) => {
    const url = `http://${ip}:${netInfo?.port ?? "3000"}/api/raw`
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }, [netInfo])

  const primaryIP = netInfo?.primaryLAN ?? null
  const hasPacket = (raw?.postCount ?? 0) > 0
  const avgLatency = pingHistory.length > 0 ? Math.round(pingHistory.reduce((a, b) => a + b, 0) / pingHistory.length) : null

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* ── IP CHANGED WARNING ─────────────────── */}
      {ipChanged && previousIP && primaryIP && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2.5">
          <ShieldAlert className="size-4 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-red-500">LAN IP CHANGED</span>
            <span className="text-[10px] text-red-500/60 ml-2">
              {previousIP} → <span className="text-emerald-400 font-bold">{primaryIP}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { if (netInfo?.esp32URL) { navigator.clipboard.writeText(netInfo.esp32URL); setCopied(true); setTimeout(() => setCopied(false), 2000) } }}
              className="flex items-center gap-1 rounded border border-red-500/20 bg-red-500/5 px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Copy className="size-2.5" /> COPY URL
            </button>
            <button type="button" onClick={() => setIpChanged(false)} className="text-[10px] text-red-500/40 hover:text-red-500">DISMISS</button>
          </div>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {online ? <Wifi className="size-4 text-emerald-500" /> : <WifiOff className="size-4 text-red-500" />}
          <h1 className="text-sm font-semibold tracking-tight">Network Diagnostics</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider",
            online ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500" : "border-red-500/30 bg-red-500/5 text-red-500"
          )}>
            {online ? "SERVER REACHABLE" : "SERVER NOT REACHABLE"}
          </span>

          <span className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider",
            !primaryIP ? "border-red-500/30 bg-red-500/5 text-red-500"
            : hasPacket ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
            : "border-amber-500/30 bg-amber-500/5 text-amber-500"
          )}>
            {!primaryIP ? "NO LAN" : hasPacket ? "PACKET RECEIVED" : "WAITING ESP32"}
          </span>
        </div>

        {avgLatency !== null && (
          <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
            avg ping {formatLatency(avgLatency)}
          </span>
        )}
      </div>

      {/* ── PRIMARY LAN ────────────────────────── */}
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="size-3.5 text-emerald-500" />
          <span className="text-[11px] font-semibold tracking-wide">PRIMARY LAN</span>
          {netInfo?.primaryInterface && (
            <span className="rounded border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 text-[9px] font-bold text-emerald-500/80 tracking-wider">
              {netInfo.primaryInterface}
            </span>
          )}
          {primaryIP && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              {netInfo?.hostname} · {netInfo?.port}
            </span>
          )}
        </div>

        {primaryIP ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-md bg-muted/30 p-2.5">
              <code className="text-base font-bold text-emerald-500 tabular-nums">{primaryIP}:{netInfo!.port}</code>
              <button
                type="button"
                onClick={() => copyUrl(primaryIP)}
                className="flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-semibold text-emerald-500 hover:bg-emerald-500/10 transition-colors"
              >
                <Copy className="size-3" /> {copied ? "COPIED" : "COPY ESP32 URL"}
              </button>
            </div>

            {netInfo?.esp32URL && (
              <div className="rounded-md bg-muted/20 px-2.5 py-1.5">
                <code className="text-[10px] text-amber-500/80 break-all">
                  const char* SERVER_URL = &quot;{netInfo.esp32URL}&quot;;
                </code>
              </div>
            )}

            {netInfo!.virtualIPs.length > 0 && (
              <div className="text-[9px] text-muted-foreground/30">
                {netInfo!.virtualIPs.length} virtual ignored: {netInfo!.virtualIPs.join(", ")}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-red-500/60">No LAN IP detected — connect to WiFi/Ethernet</div>
        )}
      </div>

      {/* ── PING + PACKETS GRID ────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* PING */}
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="size-3.5 text-blue-500" />
            <span className="text-[11px] font-semibold tracking-wide">GET /api/ping</span>
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
              {ping ? formatLatency(ping.latencyMs) : "—"}
            </span>
          </div>
          {pingHistory.length > 1 && (
            <div className="flex items-end gap-px h-10">
              {pingHistory.map((l, i) => {
                const max = Math.max(...pingHistory, 1)
                const h = Math.max(2, (l / max) * 100)
                return <div key={i} className="w-1.5 rounded-t transition-colors" style={{ height: `${h}%`, backgroundColor: l < 40 ? "#10b981" : l < 150 ? "#f59e0b" : "#ef4444" }} />
              })}
            </div>
          )}
        </div>

        {/* RAW PACKETS */}
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Send className="size-3.5 text-amber-500" />
            <span className="text-[11px] font-semibold tracking-wide">POST /api/raw</span>
            <span className={cn("ml-auto text-[10px] font-bold tabular-nums", hasPacket ? "text-emerald-500" : "text-red-500/60")}>
              {raw?.postCount ?? 0} packets
            </span>
          </div>

          {raw?.lastPacket ? (
            <div className={cn("rounded-md p-2 transition-colors duration-500", flashPacket ? "bg-emerald-500/5" : "bg-muted/20")}>
              <div className="text-[9px] text-muted-foreground mb-1">{elapsed(raw.lastPacket.receivedAt)}</div>
              <pre className="whitespace-pre-wrap break-all text-[10px] text-emerald-500/80">
                {raw.lastPacket.body}
              </pre>
            </div>
          ) : (
            <div className="space-y-2">
              {raw && raw.postCount === 0 && noPacketSeconds > 30 && (
                <div className="rounded border border-red-500/20 bg-red-500/5 px-2 py-1.5 text-[10px] font-semibold text-red-500">
                  <XCircle className="size-3 inline mr-1" />
                  NO PACKETS IN {noPacketSeconds}s
                </div>
              )}
              <div className="text-[10px] text-muted-foreground/40">
                POST {netInfo?.esp32URL ?? "http://IP:3000/api/raw"}<br />
                {`{"temp":24.5,"hum":61.2}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TOPOLOGY + TEST BUTTON ─────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <span className="text-blue-500/80">ESP32</span>
          <ArrowRight className="size-3" />
          <span className="text-amber-500/80">WiFi</span>
          <ArrowRight className="size-3" />
          <span className="text-red-500/60">?</span>
          <ArrowRight className="size-3" />
          <span className="text-emerald-500/80">{primaryIP ?? "LAN"}:{netInfo?.port ?? "3000"}</span>
        </div>

        <button
          type="button"
          onClick={testRawPost}
          disabled={testRunning}
          className="flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-semibold text-emerald-500/80 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
        >
          <Send className="size-3" />
          {testRunning ? "POSTING..." : "SIMULATE ESP32"}
        </button>

        {testResult && (
          <span className={cn("text-[10px]", testResult.startsWith("OK") ? "text-emerald-500" : "text-red-500")}>
            {testResult}
          </span>
        )}
      </div>

      {/* ── DIAGNOSTIC GUIDE (collapsible) ─────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <ChevronDown className={cn("size-3 transition-transform", showGuide && "rotate-180")} />
          Diagnostic Guide
        </button>

        {showGuide && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/50 bg-card p-3">
              <div className="text-[11px] font-semibold mb-2">1. Phone Test</div>
              <code className="block text-[10px] text-emerald-500/80 break-all mb-1">
                http://{primaryIP ?? "IP"}:{netInfo?.port ?? "3000"}/api/ping
              </code>
              <div className="text-[10px] text-muted-foreground/50">Open in phone browser on same WiFi. Should show JSON.</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-card p-3">
              <div className="text-[11px] font-semibold mb-2">2. Common Issues</div>
              <div className="text-[10px] text-muted-foreground/60 space-y-0.5">
                <div>• Windows Firewall — block port 3000</div>
                <div>• WiFi AP Isolation — devices isolated</div>
                <div>• 5 GHz vs 2.4 GHz — ESP32 only 2.4</div>
                <div>• Wrong IP — DHCP changed address</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
