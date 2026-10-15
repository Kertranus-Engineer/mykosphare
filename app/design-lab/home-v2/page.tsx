import type { Metadata } from "next"

import { HomeScreen } from "@/features/home-v2/screens/home-screen"

export const metadata: Metadata = { title: "HOME V2 · Inicio" }

export default function HomeV2Page() {
  return <HomeScreen />
}
