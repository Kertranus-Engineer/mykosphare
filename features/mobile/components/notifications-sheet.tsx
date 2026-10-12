"use client"

import Link from "next/link"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useMobileData } from "../mobile-data-context"
import { ActivityList } from "./activity-list"

export function NotificationsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { activity } = useMobileData()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pr-14">
          <SheetTitle>Notificaciones</SheetTitle>
          <SheetDescription>Alertas activas y eventos de esta sesión.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <ActivityList items={activity} limit={30} emptyTitle="Todo en orden" emptyHint="No hay alertas activas ni eventos recientes." />
        </div>
        <div className="p-4">
          <Link
            href="/dashboard/alerts"
            className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-muted/40 text-sm font-medium text-cyan-600 dark:text-cyan-400 active:bg-muted"
          >
            Configuración de alertas (escritorio)
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
