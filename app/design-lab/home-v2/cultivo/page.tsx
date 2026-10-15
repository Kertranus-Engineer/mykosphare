import type { Metadata } from "next"

import { CultivoScreen } from "@/features/home-v2/screens/cultivo-screen"

export const metadata: Metadata = { title: "HOME V2 · Cultivo" }

export default function HomeV2CropPage() {
  return <CultivoScreen />
}
