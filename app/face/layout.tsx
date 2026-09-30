import type { Metadata, Viewport } from "next"
import { Suspense, type ReactNode } from "react"
import { GrowProvider } from "@/features/grow/data/grow-provider"
import "@/features/grow/styles/grow.css"

export const metadata: Metadata = {
  title: "MYKO",
  description: "Pantalla ambiental de MYKOSPHARE para el teléfono montado en la cámara de cultivo.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "MYKO", statusBarStyle: "black-translucent" },
}

export const viewport: Viewport = {
  themeColor: "#0b0e0c",
  colorScheme: "dark",
  viewportFit: "cover",
}

/** Ambient mode: no sidebar, no navigation shell. */
export default function FaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grow-root">
      <Suspense fallback={null}>
        <GrowProvider>{children}</GrowProvider>
      </Suspense>
    </div>
  )
}
