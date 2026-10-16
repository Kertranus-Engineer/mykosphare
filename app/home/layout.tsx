import type { Metadata, Viewport } from "next"
import { Suspense, type ReactNode } from "react"

import "@/features/home-v2/styles/home-v2.css"
import { HomeV2Fallback, HomeV2Shell } from "@/features/home-v2/components/shell/shell"
import { THEME_BOOT_SCRIPT } from "@/features/home-v2/data/theme-boot"

export const metadata: Metadata = {
  title: { default: "Inicio", template: "%s · MYKOSPHARE" },
  description: "MYKOSPHARE HOME: tu cultivo, el ambiente y el estado del dispositivo desde el teléfono.",
}

// viewport-fit=cover lets the nav sit under the home indicator; the shell pads itself with env(safe-area-inset-*).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07110d",
}

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Sets the lab theme before first paint (its own stored preference). */}
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      <Suspense fallback={<HomeV2Fallback />}>
        <HomeV2Shell>{children}</HomeV2Shell>
      </Suspense>
    </>
  )
}
