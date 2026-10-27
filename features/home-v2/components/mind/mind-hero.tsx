"use client"

import Link from "next/link"
import { ArrowRight, Droplets, Eye, Thermometer } from "lucide-react"

import { useNow } from "@/features/mobile/use-now"
import { agoText, num, rangeText, type MetricId, type Range } from "@/lib/grow/intelligence"
import { stageLabel } from "@/lib/grow/presentation/stage"
import { useHomeV2 } from "../../data/home-v2-provider"
import { TONE } from "../../data/intelligence-view"
import type { Tone } from "../../data/model"
import { Card, Skeleton, ToneDot } from "../ui/surface"
import { Sparkline } from "../ui/sparkline"

const ICON = { temperature: Thermometer, humidity: Droplets } as const
const LABEL: Record<MetricId, string> = { temperature: "Temperatura", humidity: "Humedad" }

function MetricBlock({ metric, value, range, tone, series, minSpan, stale }: {
  metric: MetricId; value: number | null; range?: Range; tone: Tone; series: number[]; minSpan: number; stale: boolean
}) {
  const Icon = ICON[metric]
  return (
    <div className="hv2-mind-metric" data-tone={tone} data-stale={stale || undefined}>
      <span className="hv2-mind-metric-label"><Icon aria-hidden className="size-4" />{LABEL[metric]}</span>
      <span className="hv2-mind-metric-value">
        {value === null ? "—" : metric === "temperature" ? num(value) : num(value, 0)}
        <small>{metric === "temperature" ? "°C" : "%"}</small>
      </span>
      {range && <span className="hv2-mind-metric-range">Objetivo {rangeText(metric, range)}</span>}
      <Sparkline values={series} minSpan={minSpan} className="hv2-mind-spark" />
    </div>
  )
}

/** Inicio, answering in five seconds: how is my crop, is the device connected, what are the conditions, do I need to act. */
export function MindHero() {
  const { intelligence, environment, device, cloudStatus } = useHomeV2()
  const now = useNow(5_000)

  if (!intelligence) {
    return cloudStatus === "loading" || cloudStatus === "demo" || now === null
      ? <Card className="hv2-mind" aria-busy="true"><Skeleton className="hv2-mind-skeleton" /></Card>
      : null
  }
  const { report, cultivation } = intelligence
  const tone = TONE[report.summary.tone]
  const metrics = environment.status === "ready" ? environment.metrics : []
  const series = (id: MetricId) => metrics.find(m => m.id === id)
  const flagged = (id: MetricId): Tone => {
    const f = report.findings.find(x => x.metric === id && (x.kind.endsWith("_low") || x.kind.endsWith("_high")))
    return f ? (f.severity === "critical" ? "crit" : "warn") : report.targets?.[id] && report.connection === "live" ? "ok" : "muted"
  }
  const stale = report.connection !== "live"
  const age = report.current && now !== null ? agoText(now - Date.parse(report.current.observedAt)) : null
  const day = cultivation ? Math.max(1, Math.floor(((now ?? Date.parse(report.generatedAt)) - Date.parse(cultivation.startedAt)) / 86_400_000) + 1) : null

  return (
    <Card className="hv2-mind" data-tone={tone} aria-labelledby="hv2-mind-h">
      <div className="hv2-mind-top">
        <span className="hv2-mind-device"><ToneDot tone={device.tone} pulse={device.kind === "live"} />{intelligence.deviceName ?? "Mi dispositivo"} · {device.label}</span>
        {age && <span className="hv2-mind-age">{age}</span>}
      </div>
      <h2 id="hv2-mind-h" className="hv2-mind-headline">{report.summary.headline}</h2>
      <p className="hv2-mind-detail">{report.summary.detail}</p>
      {cultivation && (
        <p className="hv2-mind-crop">{cultivation.profile.displayName} · {stageLabel(cultivation.stage)}{day ? ` · día ${day}` : ""}{cultivation.rangesSource === "owner" ? " · rangos tuyos" : cultivation.profile.validation === "sample" ? " · perfil de ejemplo" : ""}</p>
      )}
      <div className="hv2-mind-metrics">
        <MetricBlock metric="temperature" value={report.current?.temperature ?? null} range={report.targets?.temperature} tone={flagged("temperature")} series={series("temperature")?.series ?? []} minSpan={2} stale={stale} />
        <MetricBlock metric="humidity" value={report.current?.humidity ?? null} range={report.targets?.humidity} tone={flagged("humidity")} series={series("humidity")?.series ?? []} minSpan={8} stale={stale} />
      </div>
      {report.primaryAction && (
        <Link href={report.primaryAction.href} className="hv2-button hv2-button--primary hv2-button--block hv2-press">
          {report.primaryAction.label}<ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
      <p className="hv2-mind-mode"><Eye aria-hidden className="size-3.5" />MYKO observa y registra. Todavía no controla nada.</p>
    </Card>
  )
}

