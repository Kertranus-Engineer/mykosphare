import { pendingCommands } from "../route"

export async function GET() {
  const all = pendingCommands.map((c) => ({
    id: c.id,
    command: c.command,
    status: c.status,
    createdAt: c.createdAt,
    executedAt: c.executedAt,
  }))

  return Response.json({
    total: all.length,
    pending: all.filter((c) => c.status === "pending").length,
    executed: all.filter((c) => c.status === "executed").length,
    commands: all.slice(-20).reverse(),
  })
}
