"use client"

import { type ReactNode } from "react"
import { LocaleProvider } from "@/lib/locales/locale-context"
import { ThemeProvider } from "@/lib/theme/theme-provider"
import { ModeProvider } from "@/lib/operational/mode"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <ModeProvider>
          {children}
        </ModeProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}
