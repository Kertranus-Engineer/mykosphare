import { pendingCommands } from "../route"

export async function POST(req: Request) {
  const body = await req.json()
  const id = body.id as string
  const status = body.status as string

  if (!id) {
    return Response.json({ error: "Missing command id" }, { status: 400 })
  }

  const cmd = pendingCommands.find((c) => c.id === id)
  if (!cmd) {
    return Response.json({ error: "Command not found" }, { status: 404 })
  }

  cmd.status = status === "executed" ? "executed" : "pending"
  if (status === "executed") {
    cmd.executedAt = new Date().toISOString()
  }

  console.log(`COMMAND ACK: ${cmd.command} → ${cmd.status}`)

  return Response.json({ success: true, id, status: cmd.status })
}

export async function GET() {
  const pending = pendingCommands.filter((c) => c.status === "pending")
  const executed = pendingCommands.filter((c) => c.status === "executed").slice(-10)
  return Response.json({
    pending: pending.length,
    total: pendingCommands.length,
    recent: executed.map((c) => ({
      id: c.id,
      command: c.command,
      status: c.status,
      executedAt: c.executedAt,
    })),
  })
}
