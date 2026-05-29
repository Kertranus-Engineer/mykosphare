export type ActuatorType = "fan" | "humidifier" | "heater" | "lighting"
export type ActuatorState = "on" | "off" | "auto"
export type ActuatorMode = "manual" | "automatic"

export interface ActuatorConfig {
  id: string
  type: ActuatorType
  label: string
  state: ActuatorState
  mode: ActuatorMode
  autoThresholds: {
    tempOn?: number
    tempOff?: number
    humOn?: number
    humOff?: number
  }
  lastToggled: string | null
}

export interface AutomationCommand {
  deviceId: string
  actuator: ActuatorType
  action: "on" | "off"
  timestamp: string
}

export interface AutomationState {
  actuators: ActuatorConfig[]
  history: AutomationCommand[]
}
