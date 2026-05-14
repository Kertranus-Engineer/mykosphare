export type CommandType =
  | "airflow"
  | "lighting"
  | "sterilization"
  | "relay-power"
  | "mesh-restart"
  | "emergency-isolation"

export type CommandStatus = "queued" | "acknowledged" | "executing" | "completed" | "failed"

export interface Command {
  id: string
  type: CommandType
  targetNodeId: string
  targetSystem: string
  params: Record<string, string | number | boolean>
  status: CommandStatus
  priority: "low" | "normal" | "high" | "critical"
  issuedAt: string
  acknowledgedAt: string | null
  executedAt: string | null
  completedAt: string | null
  description: string
  result: string | null
  issuedBy: string
}

export interface CommandQueue {
  commands: Command[]
  executing: string | null
}

export const COMMAND_LABELS: Record<CommandType, string> = {
  airflow: "Airflow Adjustment",
  lighting: "Lighting Control",
  sterilization: "Sterilization Cycle",
  "relay-power": "Relay Power Toggle",
  "mesh-restart": "Mesh Network Restart",
  "emergency-isolation": "Emergency Isolation",
}

export const COMMAND_ICONS: Record<CommandType, string> = {
  airflow: "Wind",
  lighting: "Sun",
  sterilization: "FlaskConical",
  "relay-power": "Zap",
  "mesh-restart": "RefreshCw",
  "emergency-isolation": "Shield",
}

export const COMMAND_STATUS_COLORS: Record<CommandStatus, string> = {
  queued: "text-muted-foreground",
  acknowledged: "text-blue-500",
  executing: "text-amber-500",
  completed: "text-emerald-500",
  failed: "text-red-500",
}

export const COMMAND_STATUS_BG: Record<CommandStatus, string> = {
  queued: "bg-muted/30",
  acknowledged: "bg-blue-500/10",
  executing: "bg-amber-500/10",
  completed: "bg-emerald-500/10",
  failed: "bg-red-500/10",
}

export const COMMAND_DESCRIPTIONS: Record<CommandType, string> = {
  airflow: "Adjust chamber airflow and FAE parameters",
  lighting: "Modify lighting cycle intensity and duration",
  sterilization: "Initiate sterilization cycle for chamber decontamination",
  "relay-power": "Toggle power state of relay-controlled device",
  "mesh-restart": "Restart mesh network communication infrastructure",
  "emergency-isolation": "Isolate chamber from all systems — emergency protocol",
}
