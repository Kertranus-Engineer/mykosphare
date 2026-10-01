import { GROW_COPY, type PresentedDevelopment } from "@/lib/grow/presentation"
import type { MykoViewModel } from "@/lib/grow/types"
import { MykoRenderer } from "../myko/myko-renderer"
import { deriveMykoTraits } from "../myko/traits"

/**
 * MYKO's forms as a static path. Thumbnails are illustrations of each form
 * (content mood, no motion); only the current one reflects this run's mood.
 * All of them are drawn with this cultivation's traits. Future forms appear as
 * THIS MYKO's silhouettes, still to be revealed by the real cultivation (the
 * next one slightly lit): anticipation without XP or levels — identity, not a
 * prediction of biology.
 */
export function FormTrack({ development, model, identity }: { development: PresentedDevelopment; model: MykoViewModel; identity?: string }) {
  const traits = deriveMykoTraits(identity)
  const next = development.forms.find((entry) => entry.status === "future")?.form
  return (
    <ol className="g-forms" aria-label={GROW_COPY.development.title}>
      {development.forms.map((entry) => (
        <li
          key={entry.form}
          className="g-form"
          data-status={entry.status}
          data-next={entry.form === next ? "true" : undefined}
          aria-current={entry.status === "current" ? "step" : undefined}
        >
          <span className="g-form-art">
            <MykoRenderer model={{ ...model, form: entry.form, mood: entry.status === "current" ? model.mood : "content", attention: "none" }} traits={traits} still decorative />
          </span>
          {entry.name}
          <span className="g-form-marker" aria-hidden="true" />
        </li>
      ))}
    </ol>
  )
}
