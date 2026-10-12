import type { Metadata } from "next"
import { EnvironmentScreen } from "@/features/mobile/screens/environment-screen"

export const metadata: Metadata = { title: "Ambiente" }

export default function HomeEnvironmentPage() {
  return <EnvironmentScreen />
}
