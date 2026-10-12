import type { Metadata } from "next"
import { HistoryScreen } from "@/features/mobile/screens/history-screen"

export const metadata: Metadata = { title: "Historial" }

export default function HomeHistoryPage() {
  return <HistoryScreen />
}
