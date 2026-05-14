import type { Command, CommandStatus, CommandType } from "./types"

let nextId = 1
function generateId(): string {
  return `cmd-${Date.now()}-${nextId++}`
}

function randomDelay(): number {
  return 2000 + Math.random() * 4000
}

export function createCommand(
  type: CommandType,
  targetNodeId: string,
  targetSystem: string,
  params: Record<string, string | number | boolean>,
  priority: Command["priority"] = "normal",
  issuedBy = "operator"
): Command {
  return {
    id: generateId(),
    type,
    targetNodeId,
    targetSystem,
    params,
    status: "queued",
    priority,
    issuedAt: new Date().toISOString(),
    acknowledgedAt: null,
    executedAt: null,
    completedAt: null,
    description: `${type} on ${targetNodeId}`,
    result: null,
    issuedBy,
  }
}

export function acknowledgeCommand(cmd: Command): Command {
  return {
    ...cmd,
    status: "acknowledged" as CommandStatus,
    acknowledgedAt: new Date().toISOString(),
  }
}

export function executeCommand(cmd: Command): Command {
  return {
    ...cmd,
    status: "executing" as CommandStatus,
    executedAt: new Date().toISOString(),
  }
}

export function completeCommand(cmd: Command, result: string): Command {
  return {
    ...cmd,
    status: "completed" as CommandStatus,
    completedAt: new Date().toISOString(),
    result,
  }
}

export function failCommand(cmd: Command, reason: string): Command {
  return {
    ...cmd,
    status: "failed" as CommandStatus,
    completedAt: new Date().toISOString(),
    result: reason,
  }
}

export function simulateCommandExecution(cmd: Command): Promise<Command> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const acknowledged = acknowledgeCommand(cmd)
      setTimeout(() => {
        const executed = executeCommand(acknowledged)
        setTimeout(() => {
          const success = Math.random() > 0.1
          resolve(
            success
              ? completeCommand(executed, `${cmd.type} completed successfully on ${cmd.targetNodeId}`)
              : failCommand(executed, `Simulated failure: ${cmd.type} could not be completed`)
          )
        }, randomDelay())
      }, randomDelay())
    }, 1000)
  })
}
