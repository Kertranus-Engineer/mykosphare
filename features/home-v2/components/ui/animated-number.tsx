"use client"

import { animate, useReducedMotion } from "framer-motion"
import { useEffect, useRef } from "react"

/**
 * Tweens between metric values by writing text straight to the node (no React
 * re-render per frame). The first value is rendered statically; later changes
 * tween in 400 ms and flash once via CSS. Reduced motion → instant swap.
 */
export function AnimatedNumber({ value, decimals = 1, className }: { value: number; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(value)
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const from = shown.current
    if (from === value) return
    shown.current = value
    if (reduce) {
      node.textContent = value.toFixed(decimals)
      return
    }
    node.removeAttribute("data-changed")
    // Restart the flash animation.
    void node.offsetWidth
    node.setAttribute("data-changed", "")
    const controls = animate(from, value, {
      duration: 0.4,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (latest) => {
        node.textContent = latest.toFixed(decimals)
      },
      onComplete: () => {
        node.textContent = value.toFixed(decimals)
      },
    })
    return () => controls.stop()
  }, [value, decimals, reduce])

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      {value.toFixed(decimals)}
    </span>
  )
}
