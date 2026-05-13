"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { fetchLogs, type ServiceLogEntry } from "@/lib/services/logs-service"
import { fetchDevices, type ServiceDevice } from "@/lib/services/devices-service"
import { fetchRecentTelemetry, type TelemetryRow } from "@/lib/services/telemetry-service"
import type { Setting } from "@/types/database"
import type { RealtimeChannel } from "@supabase/supabase-js"

const DEPLOYMENT_ID = "MYK-CH-001"

type ConnectionStatus = "connecting" | "live" | "degraded" | "offline"

let channelIdCounter = 0

function nextChannelId(base: string) {
  return `${base}-${++channelIdCounter}`
}

export function useRealtimeLogs(limit = 50) {
  const [data, setData] = useState<ServiceLogEntry[]>([])
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [latency, setLatency] = useState<number | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    const supabase = supabaseRef.current

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    fetchLogs(limit).then((result) => {
      if (!cancelled) setData(result)
    })

    const channel = supabase
      .channel(nextChannelId("realtime-logs"))
      .on(
        "postgres_changes" as const,
        { event: "INSERT", schema: "public", table: "logs", filter: `deployment_id=eq.${DEPLOYMENT_ID}` },
        (payload: { new: Record<string, unknown>; commit_timestamp?: string }) => {
          if (cancelled) return
          const ts = payload.commit_timestamp ? new Date(payload.commit_timestamp).getTime() : Date.now()
          setLatency(Math.max(0, Date.now() - ts))
          setData((prev) => {
            const entry = payload.new as unknown as ServiceLogEntry
            if (prev.some((e) => e.id === entry.id)) return prev
            return [entry, ...prev].slice(0, limit)
          })
        }
      )
      .subscribe((subStatus: string) => {
        if (cancelled) return
        setStatus(subStatus === "SUBSCRIBED" ? "live" : subStatus === "CHANNEL_ERROR" ? "degraded" : "connecting")
      })

    channelRef.current = channel

    const pinger = setInterval(async () => {
      try {
        const t0 = Date.now()
        const { error } = await supabase.from("logs").select("id", { count: "exact", head: true }).limit(1)
        if (!error) {
          setLatency(Date.now() - t0)
          setStatus((s) => (s === "offline" ? "degraded" : s === "connecting" ? "live" : s))
        }
      } catch {
        setStatus("offline")
      }
    }, 30000)

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      clearInterval(pinger)
    }
  }, [limit])

  return { data, status, latency }
}

export function useRealtimeDevices() {
  const [data, setData] = useState<ServiceDevice[]>([])
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [latency, setLatency] = useState<number | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    const supabase = supabaseRef.current

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    fetchDevices().then((result) => {
      if (!cancelled) setData(result)
    })

    const channel = supabase
      .channel(nextChannelId("realtime-devices"))
      .on(
        "postgres_changes" as const,
        { event: "*", schema: "public", table: "devices", filter: `deployment_id=eq.${DEPLOYMENT_ID}` },
        (payload: { new: Record<string, unknown>; commit_timestamp?: string }) => {
          if (cancelled) return
          const ts = payload.commit_timestamp ? new Date(payload.commit_timestamp).getTime() : Date.now()
          setLatency(Math.max(0, Date.now() - ts))
          setData((prev) => {
            const updated = payload.new as unknown as ServiceDevice
            const existing = prev.findIndex((d) => d.device_id === updated.device_id)
            if (existing >= 0) {
              const next = [...prev]
              next[existing] = updated
              return next
            }
            return [...prev, updated]
          })
        }
      )
      .subscribe((subStatus: string) => {
        if (cancelled) return
        setStatus(subStatus === "SUBSCRIBED" ? "live" : subStatus === "CHANNEL_ERROR" ? "degraded" : "connecting")
      })

    channelRef.current = channel

    const pinger = setInterval(async () => {
      try {
        const t0 = Date.now()
        const { error } = await supabase.from("devices").select("id", { count: "exact", head: true }).limit(1)
        if (!error) {
          setLatency(Date.now() - t0)
          setStatus((s) => (s === "offline" ? "degraded" : s === "connecting" ? "live" : s))
        }
      } catch {
        setStatus("offline")
      }
    }, 30000)

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      clearInterval(pinger)
    }
  }, [])

  return { data, status, latency }
}

export function useRealtimeTelemetry(limit = 200) {
  const [data, setData] = useState<TelemetryRow[]>([])
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [latency, setLatency] = useState<number | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    const supabase = supabaseRef.current

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    fetchRecentTelemetry(limit).then((result) => {
      if (!cancelled) setData(result)
    })

    const channel = supabase
      .channel(nextChannelId("realtime-telemetry"))
      .on(
        "postgres_changes" as const,
        { event: "INSERT", schema: "public", table: "telemetry", filter: `deployment_id=eq.${DEPLOYMENT_ID}` },
        (payload: { new: Record<string, unknown>; commit_timestamp?: string }) => {
          if (cancelled) return
          const ts = payload.commit_timestamp
            ? new Date(payload.commit_timestamp).getTime()
            : Date.now()
          setLatency(Math.max(0, Date.now() - ts))
          setData((prev) => {
            const entry = payload.new as unknown as TelemetryRow
            if (prev.some((e) => e.id === entry.id)) return prev
            return [entry, ...prev].slice(0, limit)
          })
        }
      )
      .subscribe((subStatus: string) => {
        if (cancelled) return
        setStatus(
          subStatus === "SUBSCRIBED"
            ? "live"
            : subStatus === "CHANNEL_ERROR"
              ? "degraded"
              : "connecting"
        )
      })

    channelRef.current = channel

    const pinger = setInterval(async () => {
      try {
        const t0 = Date.now()
        const { error } = await supabase
          .from("telemetry")
          .select("id", { count: "exact", head: true })
          .limit(1)
        if (!error) {
          setLatency(Date.now() - t0)
          setStatus((s) => (s === "offline" ? "degraded" : s === "connecting" ? "live" : s))
        }
      } catch {
        setStatus("offline")
      }
    }, 30000)

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      clearInterval(pinger)
    }
  }, [limit])

  return { data, status, latency }
}

export function useRealtimeAlerts(limit = 30) {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [latency, setLatency] = useState<number | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    const supabase = supabaseRef.current

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    ;(async () => {
      try {
        const { data: result } = await supabase
          .from("alerts")
          .select("*")
          .eq("deployment_id", DEPLOYMENT_ID)
          .order("created_at", { ascending: false })
          .limit(limit)
        if (!cancelled) setData(result ?? [])
      } catch {
        if (!cancelled) setData([])
      }
    })()

    const channel = supabase
      .channel(nextChannelId("realtime-alerts"))
      .on(
        "postgres_changes" as const,
        { event: "INSERT", schema: "public", table: "alerts", filter: `deployment_id=eq.${DEPLOYMENT_ID}` },
        (payload: { new: Record<string, unknown>; commit_timestamp?: string }) => {
          if (cancelled) return
          const ts = payload.commit_timestamp ? new Date(payload.commit_timestamp).getTime() : Date.now()
          setLatency(Math.max(0, Date.now() - ts))
          setData((prev) => {
            if (prev.some((a) => a.id === payload.new.id)) return prev
            return [payload.new, ...prev].slice(0, limit)
          })
        }
      )
      .subscribe((subStatus: string) => {
        if (cancelled) return
        setStatus(subStatus === "SUBSCRIBED" ? "live" : subStatus === "CHANNEL_ERROR" ? "degraded" : "connecting")
      })

    channelRef.current = channel

    const pinger = setInterval(async () => {
      try {
        const t0 = Date.now()
        const { error } = await supabase.from("alerts").select("id", { count: "exact", head: true }).limit(1)
        if (!error) {
          setLatency(Date.now() - t0)
          setStatus((s) => (s === "offline" ? "degraded" : s === "connecting" ? "live" : s))
        }
      } catch {
        setStatus("offline")
      }
    }, 30000)

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      clearInterval(pinger)
    }
  }, [limit])

  return { data, status, latency }
}

export function useRealtimeSettings() {
  const [settings, setSettings] = useState<Setting | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [latency, setLatency] = useState<number | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const refresh = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    supabaseRef.current
      .from("settings")
      .select("*")
      .eq("deployment_id", DEPLOYMENT_ID)
      .maybeSingle()
      .then(({ data, error }: { data: Setting | null; error: unknown }) => {
        if (!error && data) setSettings(data as unknown as Setting)
      })
  }, [])

  useEffect(() => {
    let cancelled = false

    refresh()

    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    const supabase = supabaseRef.current

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(nextChannelId("realtime-settings"))
      .on(
        "postgres_changes" as const,
        { event: "*", schema: "public", table: "settings", filter: `deployment_id=eq.${DEPLOYMENT_ID}` },
        (payload: { new: Record<string, unknown>; commit_timestamp?: string }) => {
          if (cancelled) return
          const ts = payload.commit_timestamp ? new Date(payload.commit_timestamp).getTime() : Date.now()
          setLatency(Math.max(0, Date.now() - ts))
          if (payload.new) setSettings(payload.new as unknown as Setting)
        }
      )
      .subscribe((subStatus: string) => {
        if (cancelled) return
        setStatus(subStatus === "SUBSCRIBED" ? "live" : subStatus === "CHANNEL_ERROR" ? "degraded" : "connecting")
      })

    channelRef.current = channel

    const pinger = setInterval(async () => {
      try {
        const t0 = Date.now()
        const { error } = await supabase.from("settings").select("id", { count: "exact", head: true }).limit(1)
        if (!error) {
          setLatency(Date.now() - t0)
          setStatus((s) => (s === "offline" ? "degraded" : s === "connecting" ? "live" : s))
        }
      } catch {
        setStatus("offline")
      }
    }, 30000)

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      clearInterval(pinger)
    }
  }, [refresh])

  return { settings, status, latency, refresh }
}

export type { ConnectionStatus }
