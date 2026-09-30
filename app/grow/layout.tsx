import type { Metadata, Viewport } from "next"
import { Suspense, type ReactNode } from "react"
import { GrowProvider } from "@/features/grow/data/grow-provider"
import { GrowShell, GrowShellFallback } from "@/features/grow/components/grow-shell"
import "@/features/grow/styles/grow.css"

export const metadata: Metadata = {
  title: { default: "Mi cultivo", template: "%s · MYKOSPHARE" },
  description: "Cómo está tu cultivo, qué necesita y qué pasó hoy.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#0d110f",
  colorScheme: "dark",
  viewportFit: "cover",
}

/** Grower Mode: separate from the Engineering Mode dashboard shell. */
export default function GrowLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grow-root">
      <Suspense fallback={<GrowShellFallback />}>
        <GrowProvider>
          <GrowShell>{children}</GrowShell>
        </GrowProvider>
      </Suspense>
    </div>
  )
}
