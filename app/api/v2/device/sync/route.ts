import { createReadingLimiter } from "@/lib/grow/application/reading-handler"
import { createDeviceSyncHandler } from "@/lib/grow/control/handlers"
import { createSupabaseSyncStore } from "@/lib/grow/control/store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** ESP32 ↔ server: the device reports what it received/applied and gets the newest desired config. Per-device key auth. */
export const POST = createDeviceSyncHandler({ store: createSupabaseSyncStore, allow: createReadingLimiter() })
