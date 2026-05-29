import type { Metadata } from "next"
import { DashboardGrid } from "@/features/dashboard/components/dashboard-grid"

export const metadata: Metadata = { title: "Overview" }

export default function OverviewPage() {
  return <DashboardGrid />
}
