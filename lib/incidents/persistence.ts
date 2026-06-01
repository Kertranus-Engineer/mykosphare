"use client"

import { createClient } from "@/lib/supabase/client"
import { isSupabaseWritesEnabled, disableSupabaseWrites } from "@/lib/supabase/client"
import type { Incident, IncidentStatus } from "./types"

const DEPLOYMENT_ID = "MYK-CH-001"
const LOCAL_KEY = "mykosphare_incidents"

async function getClient() {
  return createClient()
}

function safeLocalGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeLocalSet(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export async function persistIncident(incident: Incident): Promise<boolean> {
  try {
    if (!isSupabaseWritesEnabled()) return false
    const supabase = await getClient()
    const { error } = await supabase.from("incidents").insert({
      title: incident.title,
      description: incident.description,
      status: incident.status,
      severity: incident.severity,
      score: incident.score,
      alert_ids: incident.alertIds,
      affected_node_ids: incident.affectedNodeIds,
      affected_systems: incident.affectedSystems,
      correlation_type: incident.correlationType,
      timeline: incident.timeline,
      resolved_at: incident.resolvedAt,
      acknowledged_at: incident.acknowledgedAt,
      deployment_id: DEPLOYMENT_ID,
    })
    if (error) {
      if ((error as any)?.status >= 401 && (error as any)?.status <= 403) { disableSupabaseWrites() }
      return false
    }
    return true
  } catch {
    appendLocalIncident(incident)
    return false
  }
}

export async function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  resolvedAt: string | null,
  acknowledgedAt: string | null
): Promise<boolean> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (resolvedAt !== null) updates.resolved_at = resolvedAt
  if (acknowledgedAt !== null) updates.acknowledged_at = acknowledgedAt

  try {
    const supabase = await getClient()
    const { error } = await supabase
      .from("incidents")
      .update(updates)
      .eq("id", incidentId)
    if (error) {
      updateLocalIncidentStatus(incidentId, status, resolvedAt, acknowledgedAt)
      return false
    }
    return true
  } catch {
    updateLocalIncidentStatus(incidentId, status, resolvedAt, acknowledgedAt)
    return false
  }
}

export async function fetchPersistedIncidents(): Promise<Incident[]> {
  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("deployment_id", DEPLOYMENT_ID)
      .order("created_at", { ascending: false })
      .limit(100)
    if (error) throw error
    if (data && data.length > 0) {
      return data.map(mapRowToIncident)
    }
    return loadLocalIncidents()
  } catch {
    return loadLocalIncidents()
  }
}

function mapRowToIncident(row: Record<string, unknown>): Incident {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    status: row.status as IncidentStatus,
    severity: row.severity as Incident["severity"],
    score: (row.score as number) ?? 50,
    alertIds: (row.alert_ids as string[]) ?? [],
    affectedNodeIds: (row.affected_node_ids as string[]) ?? [],
    affectedSystems: (row.affected_systems as string[]) ?? [],
    timeline: (row.timeline as Incident["timeline"]) ?? [],
    correlationType: row.correlation_type as Incident["correlationType"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string ?? row.created_at as string,
    resolvedAt: (row.resolved_at as string) ?? null,
    acknowledgedAt: (row.acknowledged_at as string) ?? null,
  }
}

function loadLocalIncidents(): Incident[] {
  return safeLocalGet(LOCAL_KEY, [])
}

function appendLocalIncident(incident: Incident) {
  const existing = loadLocalIncidents()
  safeLocalSet(LOCAL_KEY, [incident, ...existing])
}

function updateLocalIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  resolvedAt: string | null,
  acknowledgedAt: string | null
) {
  const existing = loadLocalIncidents()
  const updated = existing.map((inc) => {
    if (inc.id !== incidentId) return inc
    return {
      ...inc,
      status,
      resolvedAt: resolvedAt ?? inc.resolvedAt,
      acknowledgedAt: acknowledgedAt ?? inc.acknowledgedAt,
      updatedAt: new Date().toISOString(),
    }
  })
  safeLocalSet(LOCAL_KEY, updated)
}
