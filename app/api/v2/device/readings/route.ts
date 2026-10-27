import { createDeviceReadingHandler, createReadingLimiter } from "@/lib/grow/application/reading-handler"
import { createSupabaseIngestionStore } from "@/lib/grow/application/supabase-repository"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const POST = createDeviceReadingHandler({ store: createSupabaseIngestionStore, allow: createReadingLimiter() })
