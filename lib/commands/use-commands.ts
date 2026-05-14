"use client"

import { useCallback, useState, useRef } from "react"
import { createCommand, simulateCommandExecution } from "./engine"
import type { Command, CommandType } from "./types"

export interface UseCommandsResult {
  commands: Command[]
  activeCount: number
  issueCommand: (
    type: CommandType,
    targetNodeId: string,
    targetSystem: string,
    params?: Record<string, string | number | boolean>,
    priority?: Command["priority"]
  ) => void
  clearCompleted: () => void
}

export function useCommands(): UseCommandsResult {
  const [commands, setCommands] = useState<Command[]>([])
  const processingRef = useRef(false)

  const issueCommand = useCallback(
    (
      type: CommandType,
      targetNodeId: string,
      targetSystem: string,
      params: Record<string, string | number | boolean> = {},
      priority: Command["priority"] = "normal"
    ) => {
      const cmd = createCommand(type, targetNodeId, targetSystem, params, priority)
      setCommands((prev) => [cmd, ...prev])

      simulateCommandExecution(cmd).then((result) => {
        setCommands((prev) =>
          prev.map((c) => (c.id === cmd.id ? result : c))
        )
      })
    },
    []
  )

  const clearCompleted = useCallback(() => {
    setCommands((prev) => prev.filter((c) => c.status !== "completed" && c.status !== "failed"))
  }, [])

  const activeCount = commands.filter(
    (c) => c.status === "queued" || c.status === "acknowledged" || c.status === "executing"
  ).length

  return { commands, activeCount, issueCommand, clearCompleted }
}
