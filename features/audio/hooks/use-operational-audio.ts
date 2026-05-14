"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type SoundType = "alert" | "relay" | "confirm" | "ready" | "heartbeat"

interface SoundConfig {
  frequency: number
  duration: number
  type: OscillatorType
  gain: number
  repeat?: number
  repeatDelay?: number
}

const SOUNDS: Record<SoundType, SoundConfig> = {
  alert: { frequency: 880, duration: 200, type: "sawtooth", gain: 0.15, repeat: 2, repeatDelay: 100 },
  relay: { frequency: 1200, duration: 60, type: "square", gain: 0.08 },
  confirm: { frequency: 660, duration: 150, type: "sine", gain: 0.1 },
  ready: { frequency: 520, duration: 400, type: "sine", gain: 0.12 },
  heartbeat: { frequency: 440, duration: 80, type: "sine", gain: 0.06 },
}

export function useOperationalAudio() {
  const [enabled, setEnabled] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    return ctxRef.current
  }, [])

  const playTone = useCallback(
    (config: SoundConfig) => {
      if (!enabled) return
      try {
        const ctx = getContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = config.type
        osc.frequency.setValueAtTime(config.frequency, ctx.currentTime)

        gain.gain.setValueAtTime(config.gain, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration / 1000)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + config.duration / 1000)
      } catch {
        /* audio not supported */
      }
    },
    [enabled, getContext]
  )

  const play = useCallback(
    (sound: SoundType) => {
      const config = SOUNDS[sound]
      if (config.repeat && config.repeat > 1) {
        for (let i = 0; i < config.repeat; i++) {
          setTimeout(() => playTone(config), i * (config.repeatDelay ?? 100))
        }
      } else {
        playTone(config)
      }
    },
    [playTone]
  )

  const toggle = useCallback(() => setEnabled((prev) => !prev), [])

  useEffect(() => {
    return () => {
      ctxRef.current?.close()
    }
  }, [])

  return { enabled, toggle, play }
}
