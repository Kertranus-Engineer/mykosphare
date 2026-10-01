import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LabScreen } from "@/features/grow/screens/lab-screen"

export const metadata: Metadata = { title: "Visual Lab", robots: { index: false, follow: false } }

/** VISUAL DEVELOPMENT ONLY — MYKO form × mood inspection. Never available in production. */
export default function GrowLabPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <LabScreen />
}
