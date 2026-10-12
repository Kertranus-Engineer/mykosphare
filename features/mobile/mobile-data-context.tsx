"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useMobileTelemetry, type MobileTelemetry } from "./use-mobile-telemetry"
import { useMobileActivity, type ActivityItem } from "./use-mobile-activity"

interface MobileData {
  tel: MobileTelemetry
  activity: ActivityItem[]
  /** Active alerts that deserve a badge on the bell (warning / critical). */
  attentionCount: number
}

const MobileDataContext = createContext<MobileData | null>(null)

/**
 * Mounts the shared telemetry/environment hooks ONCE for the whole mobile
 * shell, so tab changes never remount them (and never re-poll or reset
 * session history).
 */
export function MobileDataProvider({ children }: { children: ReactNode }) {
  const tel = useMobileTelemetry()
  const activity = useMobileActivity(tel)
  const attentionCount = activity.filter(
    (a) => a.timestamp === null && (a.severity === "warning" || a.severity === "critical"),
  ).length

  return (
    <MobileDataContext.Provider value={{ tel, activity, attentionCount }}>
      {children}
    </MobileDataContext.Provider>
  )
}

export function useMobileData(): MobileData {
  const ctx = useContext(MobileDataContext)
  if (!ctx) throw new Error("useMobileData must be used inside <MobileDataProvider>")
  return ctx
}
