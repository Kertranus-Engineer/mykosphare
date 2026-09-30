import type { PresentedStatus } from "@/lib/grow/presentation"

export function GrowStatus({ status, as: Heading = "h1" }: { status: PresentedStatus; as?: "h1" | "h2" }) {
  return (
    <div>
      <Heading className="g-status-title" data-tone={status.tone}>{status.title}</Heading>
      <p className="g-status-body">{status.body}</p>
    </div>
  )
}
