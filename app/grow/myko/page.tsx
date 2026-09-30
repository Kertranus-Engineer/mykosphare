import type { Metadata } from "next"
import { MykoScreen } from "@/features/grow/screens/myko-screen"

export const metadata: Metadata = { title: "MYKO" }

export default function GrowMykoPage() {
  return <MykoScreen />
}
