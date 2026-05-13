"use client"

import {
  Camera,
  Clock,
  Eye,
  Image,
  Video,
  Zap,
} from "lucide-react"

import { useEnvironment } from "@/mock/environment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function CameraPage() {
  const env = useEnvironment()

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Camera</h1>
        <p className="text-sm text-muted-foreground">
          Environmental imaging and AI-powered visual monitoring
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-[3] flex-col gap-4">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Camera className="size-4 text-muted-foreground" />
                  Chamber Feed — Live
                </span>
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground">REC</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-muted/90 to-muted">
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                <div className="relative flex flex-col items-center gap-2">
                  <div className="flex size-16 items-center justify-center rounded-full border border-border/30 bg-background/40 backdrop-blur-sm">
                    <Camera className="size-6 text-muted-foreground/50" />
                  </div>
                  <span className="text-xs text-muted-foreground/60">
                    Camera feed initialized
                  </span>
                </div>
                <div className="absolute bottom-0 inset-x-0 z-10 h-8 bg-gradient-to-t from-background/70 to-transparent" />
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
                    {env.state === "WARNING" ? "MONITORING" : "ACTIVE"}
                  </span>
                </div>
                <div className="absolute bottom-2 right-3 z-10 flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground/40" />
                  <span className="text-[10px] tabular-nums text-muted-foreground/40">
                    LIVE
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Image className="size-4 text-muted-foreground" />
                  Timelapse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex aspect-video items-center justify-center rounded-lg bg-muted/50">
                  <div className="flex flex-col items-center gap-1">
                    <Video className="size-5 text-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground/40">
                      24h timelapse available
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Eye className="size-4 text-muted-foreground" />
                  AI Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className="text-xs font-medium text-emerald-500">
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Confidence</span>
                  <span className="text-xs font-medium tabular-nums text-foreground">
                    96.3%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Objects Tracked</span>
                  <span className="text-xs font-medium tabular-nums text-foreground">
                    12
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Growth Rate</span>
                  <span className="text-xs font-medium tabular-nums text-emerald-500">
                    +2.4%/day
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="size-4 text-muted-foreground" />
                Spectral Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[
                { label: "PAR Reading", value: "412 µmol/m²/s" },
                { label: "Color Temp", value: "6500K" },
                { label: "NIR Index", value: "0.84" },
                { label: "Chlorophyll", value: "Normal" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Environmental Imaging</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[
                { label: "Resolution", value: "3840 × 2160" },
                { label: "Frame Rate", value: "30 fps" },
                { label: "Compression", value: "H.265" },
                { label: "Bitrate", value: "12 Mbps" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-foreground">
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
