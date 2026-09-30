import type { Metadata } from "next"
import { CultivationScreen } from "@/features/grow/screens/cultivation-screen"

export const metadata: Metadata = { title: "Cultivo" }

export default function GrowCultivationPage() {
  return <CultivationScreen />
}
