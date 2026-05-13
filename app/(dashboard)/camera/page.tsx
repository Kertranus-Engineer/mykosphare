"use client"

import {
  Camera,
  Clock,
  Crosshair,
  Eye,
  Focus,
  Image,
  Scan,
  Video,
  Zap,
} from "lucide-react"

import { useEnvironment } from "@/mock/environment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const CORNER_STYLE = "absolute size-3 border-border/40"

export default function CameraPage() {
  const env = useEnvironment()

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Camera
        </h1>
        <p className="text-sm text-muted-foreground">
          Environmental imaging and computer vision monitoring
        </p>
      </div>

      <div className="flex flex-col gap-4 2xl:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Camera className="size-4 text-muted-foreground" />
                  Chamber Feed
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      REC
                    </span>
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground/50">
                    00:42:17
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-muted/90 to-muted">
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-background/20 to-transparent" />

                <div className="absolute inset-0 opacity-[0.03]">
                  <div className="absolute left-1/3 inset-y-0 w-px bg-foreground" />
                  <div className="absolute left-2/3 inset-y-0 w-px bg-foreground" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-foreground" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-foreground" />
                </div>

                <div
                  className="absolute inset-x-[15%] h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent animate-[scan-line_4s_ease-in-out_infinite]"
                />

                <div className={CORNER_STYLE + " top-3 left-3 border-l border-t"} />
                <div className={CORNER_STYLE + " top-3 right-3 border-r border-t"} />
                <div className={CORNER_STYLE + " bottom-3 left-3 border-l border-b"} />
                <div className={CORNER_STYLE + " bottom-3 right-3 border-r border-b"} />

                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
                  {["IR", "VIS", "NDVI"].map((band) => (
                    <div
                      key={band}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[8px] font-medium tracking-wider",
                        band === "VIS"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "bg-background/40 text-muted-foreground/60"
                      )}
                    >
                      {band}
                    </div>
                  ))}
                </div>

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 items-end">
                  <span className="text-[8px] tabular-nums text-muted-foreground/50">
                    F/2.8
                  </span>
                  <span className="text-[8px] tabular-nums text-muted-foreground/50">
                    1/125
                  </span>
                  <span className="text-[8px] tabular-nums text-muted-foreground/50">
                    ISO 400
                  </span>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-2">
                  <Crosshair className="size-6 text-muted-foreground/20" />
                </div>

                <div className="absolute bottom-0 inset-x-0 z-10 h-10 bg-gradient-to-t from-background/70 to-transparent" />
                <div className="absolute bottom-2 left-3 z-10 flex items-center gap-2">
                  <div
                    className={cn(
                      "size-1.5 rounded-full",
                      env.state === "WARNING"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    )}
                  />
                  <span className="text-[10px] text-muted-foreground/60">
                    CV PIPELINE ACTIVE
                  </span>
                </div>
                <div className="absolute bottom-2 right-3 z-10 flex items-center gap-2">
                  <div className="size-1 rounded-full bg-emerald-500/60" />
                  <span className="text-[10px] tabular-nums text-muted-foreground/50">
                    AI: 96.3%
                  </span>
                  <span className="text-[10px] text-muted-foreground/30">|</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/50">
                    3840×2160
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 lg:flex-row">
            <Card className="flex-1 transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Image className="size-4 text-muted-foreground" />
                  Timelapse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted/50">
                  <div className="flex flex-col items-center gap-1">
                    <Video className="size-5 text-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground/40">
                      24h timelapse available
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-background/40 to-transparent" />
                  <div className="absolute bottom-1 left-2 z-10">
                    <span className="text-[8px] text-muted-foreground/40">
                      Last capture: 23:45
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Eye className="size-4 text-muted-foreground" />
                  Computer Vision
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {[
                  { label: "Pipeline", value: "Operational", color: "text-emerald-500" },
                  { label: "Confidence", value: "96.3%", color: "" },
                  { label: "Objects Tracked", value: "12", color: "" },
                  { label: "Growth Rate", value: "+2.4%/day", color: "text-emerald-500" },
                  { label: "Model", value: "MykoNet v2.1", color: "" },
                  { label: "Inference", value: "32ms", color: "" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-md bg-muted/20 px-2.5 py-1.5"
                  >
                    <span className="text-[11px] text-muted-foreground">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-medium tabular-nums text-foreground",
                        item.color
                      )}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-4 2xl:w-72">
          <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="size-4 text-muted-foreground" />
                Spectral
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[
                { label: "PAR", value: "412 µmol/m²/s" },
                { label: "Color Temp", value: "6500K" },
                { label: "NIR Index", value: "0.84" },
                { label: "Chlorophyll", value: "Normal" },
                { label: "UV Index", value: "2.1" },
                { label: "LUX", value: "18,400" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-md bg-muted/20 px-2.5 py-1.5"
                >
                  <span className="text-[11px] text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardHeader>
              <CardTitle className="text-sm">Imaging</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[
                { label: "Resolution", value: "3840×2160" },
                { label: "Frame Rate", value: "30 fps" },
                { label: "Codec", value: "H.265" },
                { label: "Bitrate", value: "12 Mbps" },
                { label: "Color Depth", value: "10-bit" },
                { label: "Dynamic Range", value: "14 EV" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-md bg-muted/20 px-2.5 py-1.5"
                >
                  <span className="text-[11px] text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
