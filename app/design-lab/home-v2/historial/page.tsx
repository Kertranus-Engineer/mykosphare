import type { Metadata } from "next"

import { HistoryScreen } from "@/features/home-v2/screens/history-screen"

export const metadata: Metadata = { title: "HOME V2 · Historial" }

export default function HomeV2HistoryPage() {
  return <HistoryScreen />
}
