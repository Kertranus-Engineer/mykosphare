import type { Metadata } from "next"

import { EnvironmentScreen } from "@/features/home-v2/screens/environment-screen"

export const metadata: Metadata = { title: "Ambiente" }

export default function HomeV2EnvironmentPage() {
  return <EnvironmentScreen />
}
