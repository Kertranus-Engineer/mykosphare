import { presentBodySenses } from "@/lib/grow/presentation"
import type { GrowSnapshot } from "@/lib/grow/types"

/**
 * Everything MykoStage needs to draw THIS cultivation's MYKO, from a snapshot:
 * the view model, its identity (run id → visual traits), its installed senses
 * and the signal (last reading timestamp) that lets it visibly sense.
 */
export function mykoPresence(snapshot: GrowSnapshot) {
  return {
    model: snapshot.myko,
    identity: snapshot.run.id,
    senses: presentBodySenses(snapshot),
    signal: snapshot.reading?.timestamp ?? null,
  }
}
