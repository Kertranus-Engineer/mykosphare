export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      telemetry: {
        Row: Telemetry
        Insert: Omit<Telemetry, "id" | "created_at">
        Update: never
      }
      alerts: {
        Row: Alert
        Insert: Omit<Alert, "id" | "created_at" | "resolved">
        Update: Partial<Omit<Alert, "id" | "created_at">>
      }
      logs: {
        Row: Log
        Insert: Omit<Log, "id" | "created_at">
        Update: never
      }
      devices: {
        Row: Device
        Insert: Omit<Device, "id" | "created_at">
        Update: Partial<Omit<Device, "id" | "created_at">>
      }
      settings: {
        Row: Setting
        Insert: Omit<Setting, "id" | "created_at" | "notifications_enabled">
        Update: Partial<Omit<Setting, "id" | "created_at">>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export interface Telemetry {
  id: string
  created_at: string
  temperature: number | null
  humidity: number | null
  co2: number | null
  energy_usage: number | null
  environmental_state: string | null
  operational_mode: string | null
  deployment_id: string | null
}

export interface Alert {
  id: string
  created_at: string
  severity: string | null
  title: string | null
  description: string | null
  resolved: boolean
  deployment_id: string | null
}

export interface Log {
  id: string
  created_at: string
  message: string | null
  category: string | null
  deployment_id: string | null
}

export interface Device {
  id: string
  created_at: string
  device_id: string | null
  device_type: string | null
  status: string | null
  health: number | null
  uptime: number | null
  last_sync: string | null
  deployment_id: string | null
}

export interface Setting {
  id: string
  created_at: string
  target_temperature: number | null
  target_humidity: number | null
  target_co2: number | null
  notifications_enabled: boolean
  config: Json
  deployment_id: string | null
}
