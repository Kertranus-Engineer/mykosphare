"use client"

import { type ReactNode } from "react"
import { LocaleProvider } from "@/lib/locales/locale-context"
import { ThemeProvider } from "@/lib/theme/theme-provider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </LocaleProvider>
  )
}
