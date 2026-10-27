import type { Metadata } from "next"

import { MoreScreen } from "@/features/home-v2/screens/more-screen"

export const metadata: Metadata = { title: "Ajustes" }

export default function HomeV2MorePage() {
  return <MoreScreen />
}
