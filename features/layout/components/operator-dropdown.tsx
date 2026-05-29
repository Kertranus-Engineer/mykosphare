"use client"

import { useRef, useEffect, useState } from "react"
import {
  LogOut,
  ShieldCheck,
  Fingerprint,
  Check,
} from "lucide-react"
import { useUser } from "@/lib/auth/hooks"
import { signOut } from "@/lib/auth/actions"
import { useLocale } from "@/lib/locales/locale-context"
import type { Language } from "@/lib/locales/types"

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60_000) return "Just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Espa\u00f1ol" },
]

export function OperatorDropdown() {
  const { operatorInfo, loading } = useUser()
  const { language, setLanguage, t } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  if (loading || !operatorInfo) {
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
        OP
      </div>
    )
  }

  const initials = operatorInfo.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/80"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-border/50 bg-popover shadow-2xl shadow-black/40">
          <div className="border-b border-border/30 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {operatorInfo.displayName}
                </p>
                <p className="text-[11px] text-muted-foreground/60 truncate">
                  {operatorInfo.email}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 space-y-2">
            <div className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-2.5 py-2">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground/70">
                  {operatorInfo.role === "operator"
                    ? "Operator"
                    : operatorInfo.role}
                </p>
                <p className="text-[9px] text-muted-foreground/40 tracking-wider uppercase">
                  {t("operator.role")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-2.5 py-2">
              <Fingerprint className="size-3.5 text-muted-foreground/60" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground/70">
                  Active Session
                </p>
                <p className="text-[9px] text-muted-foreground/40 tracking-wider uppercase">
                  {formatTimestamp(new Date())}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/30 px-4 py-2.5">
            <p className="mb-2 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/50">
              {t("operator.language")}
            </p>
            <div className="flex gap-1.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => setLanguage(lang.value)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150 ${
                    language === lang.value
                      ? "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30"
                      : "text-muted-foreground/60 hover:bg-muted/50 hover:text-muted-foreground"
                  }`}
                >
                  {language === lang.value && <Check className="size-3" />}
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border/30 p-1.5">
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-3.5" />
                {t("operator.sign-out")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
