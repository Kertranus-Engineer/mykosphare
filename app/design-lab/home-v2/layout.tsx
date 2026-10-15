import type { Viewport } from "next"
import { Suspense, type ReactNode } from "react"

import { HomeV2Fallback, HomeV2Shell } from "@/features/home-v2/components/shell/shell"
import { THEME_BOOT_SCRIPT } from "@/features/home-v2/data/theme-boot"

// viewport-fit=cover lets the nav sit under the home indicator; the shell pads itself with env(safe-area-inset-*).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07110d",
}

export default function HomeV2Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Sets the lab theme before first paint (same stored preference the rest of the app uses). */}
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      <Suspense fallback={<HomeV2Fallback />}>
        <HomeV2Shell>{children}</HomeV2Shell>
      </Suspense>
    </>
  )
}
