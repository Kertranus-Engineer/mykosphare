"use client"

import { Cpu, Eye, GitBranch, Layers, Radar, Sparkles, Sprout, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useLocale } from "@/lib/locales/locale-context"
import {
  DEPLOYMENT_ID,
  REGION,
  SOFTWARE_VERSION,
  BUILD_NUMBER,
  CLUSTER,
  CREATOR_ATTRIBUTION,
  CREATOR_NAME,
  CREATOR_TAGLINE,
} from "@/mock/device-registry"

const SECTIONS = [
  {
    icon: Eye,
    key: "philosophy",
  },
  {
    icon: Radar,
    key: "operational-intelligence",
  },
  {
    icon: Cpu,
    key: "digital-twin",
  },
  {
    icon: Layers,
    key: "modular-architecture",
  },
  {
    icon: Sparkles,
    key: "future-vision",
  },
]

const VERSION_ITEMS = [
  { labelKey: "about.version", value: `MYKOSPHARE ${SOFTWARE_VERSION}` },
  { labelKey: "about.system-layer", value: "Environmental Systems Layer" },
  { labelKey: "about.deployment-ref", value: DEPLOYMENT_ID },
  { label: "Cluster", value: CLUSTER },
  { label: "Region", value: REGION },
  { label: "Build", value: BUILD_NUMBER },
]

export default function AboutPage() {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {t("about.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground/70">
          {t("about.subtitle")}
        </p>
      </div>

      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10 border-emerald-500/10">
        <CardContent className="flex items-start gap-4 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="size-5 text-emerald-500" />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground/80">
            MYKOSPHARE is an environmental intelligence platform designed to collect, analyze and visualize environmental conditions through affordable hardware and modern web technologies. The project focuses on accessibility, scalability and educational value while maintaining a professional operational interface.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => (
          <Card
            key={section.key}
            className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <section.icon className="size-4 text-muted-foreground" />
                {t(`about.${section.key}`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-relaxed text-muted-foreground/80">
                {t(`about.${section.key}.desc`)}
              </p>
            </CardContent>
          </Card>
        ))}

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10 lg:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <GitBranch className="size-4 text-muted-foreground" />
              {t("about.attribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {VERSION_ITEMS.map((item) => (
                <div
                  key={item.labelKey || item.label}
                  className="rounded-lg bg-muted/20 px-3 py-2"
                >
                  <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                    {item.labelKey ? t(item.labelKey) : item.label}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-foreground tabular-nums">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground/50 uppercase">
                {CREATOR_ATTRIBUTION}
              </p>
              <p className="text-sm font-bold tracking-[0.15em] text-foreground/80"
                style={{ textShadow: "0 0 16px rgba(16,185,129,0.08)" }}>
                {CREATOR_NAME}
              </p>
              <p className="text-[9px] tracking-wider text-muted-foreground/35">
                {CREATOR_TAGLINE}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="size-1 rounded-full bg-emerald-500/60" />
                <span className="text-[9px] tracking-[0.15em] text-emerald-500/40 uppercase font-medium">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
