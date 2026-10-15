"use client"

import { AnimatePresence, m } from "framer-motion"
import { Info, X } from "lucide-react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { COPY } from "../copy"

interface Toast {
  id: number
  title?: string
  message: string
}

interface FeedbackValue {
  notify: (toast: { title?: string; message: string }) => void
}

const FeedbackContext = createContext<FeedbackValue | null>(null)

const TOAST_MS = 4200

/** Action feedback. One toast at a time; announced politely to assistive tech. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counter = useRef(0)

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setToast(null)
  }, [])

  const notify = useCallback<FeedbackValue["notify"]>((next) => {
    if (timer.current) clearTimeout(timer.current)
    counter.current += 1
    setToast({ id: counter.current, ...next })
    timer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="hv2-toast-region" role="status" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <m.div
              key={toast.id}
              className="hv2-toast"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Info aria-hidden className="hv2-toast-icon" />
              <div className="hv2-toast-text">
                {toast.title && <p className="hv2-toast-title">{toast.title}</p>}
                <p>{toast.message}</p>
              </div>
              <button type="button" className="hv2-icon-button hv2-toast-close" onClick={dismiss} aria-label={COPY.feedback.dismiss}>
                <X aria-hidden className="size-4" />
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </FeedbackContext.Provider>
  )
}

export function useFeedback(): FeedbackValue {
  const value = useContext(FeedbackContext)
  if (!value) throw new Error("useFeedback must be used inside <FeedbackProvider>")
  return value
}
