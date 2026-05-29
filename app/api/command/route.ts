export interface CommandEntry {
  id: string
  command: string
  status: "pending" | "executed"
  createdAt: string
  executedAt: string | null
}

export const pendingCommands: CommandEntry[] = []
let cmdCounter = 0

export function pushCommand(command: string): CommandEntry {
  const entry: CommandEntry = {
    id: String(++cmdCounter),
    command,
    status: "pending",
    createdAt: new Date().toISOString(),
    executedAt: null,
  }
  pendingCommands.push(entry)
  console.log(`AUTOMATION QUEUED: ${command}`)
  return entry
}

const VALID_COMMANDS = [
  "fan_on", "fan_off",
  "humidifier_on", "humidifier_off",
  "heater_on", "heater_off",
  "all_off",
]

export async function POST(req: Request) {
  const body = await req.json()
  const command = body.command as string
  const mode = (body.mode as string) ?? "active_high"

  if (!command) {
    return Response.json({ error: "Missing command" }, { status: 400 })
  }

  if (!VALID_COMMANDS.includes(command)) {
    return Response.json({ error: `Invalid command: ${command}` }, { status: 400 })
  }

  if (command === "all_off") {
    pendingCommands.length = 0
    const entries: CommandEntry[] = []
    for (const c of ["fan_off", "humidifier_off", "heater_off"]) {
      entries.push(pushCommand(c))
    }
    console.log("AUTOMATION: ALL OFF")
    return Response.json({
      success: true,
      queued: 3,
      commands: entries.map((e) => ({ id: e.id, command: e.command, mode })),
    })
  }

  const entry = pushCommand(command)
  console.log(`AUTOMATION: ${command}`)

  return Response.json({
    success: true,
    queued: 1,
    commands: [{ id: entry.id, command: entry.command, mode }],
  })
}

export async function GET() {
  const pending = pendingCommands.filter((c) => c.status === "pending")
  const snapshot = pending.map((c) => ({
    id: c.id,
    command: c.command,
    createdAt: c.createdAt,
  }))
  pending.forEach((c) => { c.status = "executed"; c.executedAt = new Date().toISOString() })
  return Response.json({ commands: snapshot })
}
