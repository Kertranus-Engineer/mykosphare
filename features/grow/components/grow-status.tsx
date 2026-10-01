import type { PresentedStatus } from "@/lib/grow/presentation"

/** Status hero: large headline in MYKO's voice + one line of context. */
export function GrowStatus({ status, as: Heading = "h1" }: { status: PresentedStatus; as?: "h1" | "h2" }) {
  return (
    <div className="g-status">
      <Heading className="g-status-title" data-tone={status.tone}>{status.title}</Heading>
      <p className="g-status-body">{status.body}</p>
    </div>
  )
}
