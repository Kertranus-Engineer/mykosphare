import type { Metadata } from "next"
import { MoreScreen } from "@/features/mobile/screens/more-screen"

export const metadata: Metadata = { title: "Más" }

export default function HomeMorePage() {
  return <MoreScreen />
}
