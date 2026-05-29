"use client"

import { AppShell } from "@/features/layout/components/app-shell"
import { PageTransition } from "@/features/layout/components/page-transition"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  )
}
