import type { Metadata, Viewport } from "next"
import { MobileShell } from "@/features/mobile/components/mobile-shell"

export const metadata: Metadata = {
  title: "Home anterior",
  description: "MYKOSPHARE HOME — monitoreo ambiental desde tu teléfono.",
}

// viewport-fit=cover lets the bottom nav and header extend under the notch /
// home indicator; the shell pads itself with env(safe-area-inset-*).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d12",
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>
}
