"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Sprout, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { register } from "@/lib/auth/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-xs font-medium tracking-[0.2em] text-white/50 transition-all duration-500 hover:border-emerald-500/25 hover:bg-emerald-500/[0.03] hover:text-emerald-400 hover:shadow-[0_0_30px_-8px] hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-30 uppercase"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="size-3 animate-pulse rounded-full border border-white/20" />
          Creating Account
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          Register Operator
        </span>
      )}
    </button>
  )
}

export default function RegisterPage() {
  const [state, formAction] = useActionState(register, null)

  if (state?.success) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050505]">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 animate-ambient bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/[0.12] via-transparent to-transparent" />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="flex items-center justify-between px-6 py-5 sm:px-10">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
                <Sprout className="size-4 text-emerald-500" />
              </div>
              <span className="text-sm font-semibold tracking-[0.15em] text-white/80">
                MYKOSPHARE
              </span>
            </Link>
          </header>
          <main className="flex flex-1 items-center justify-center px-6 sm:px-10">
            <div className="w-full max-w-sm text-center">
              <div className="mb-6 inline-flex items-center justify-center size-14 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="size-7 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-light tracking-tight text-white">
                Registration Submitted
              </h1>
              <p className="mt-3 text-[13px] text-white/30 leading-relaxed">
                A confirmation email has been sent to your inbox. Please verify
                your email address before signing in.
              </p>
              <Link
                href="/auth/login"
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-xs font-medium tracking-[0.2em] text-white/50 transition-all duration-500 hover:border-emerald-500/25 hover:text-emerald-400 uppercase"
              >
                Proceed to Login
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050505]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 animate-ambient bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/[0.12] via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <Sprout className="size-4 text-emerald-500" />
            </div>
            <span className="text-sm font-semibold tracking-[0.15em] text-white/80">
              MYKOSPHARE
            </span>
          </Link>
          <Link
            href="/auth/login"
            className="text-[11px] tracking-wider text-white/30 transition-colors hover:text-white/60"
          >
            Sign In
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 sm:px-10">
          <div className="w-full max-w-sm">
            <div className="mb-10 text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-1.5">
                <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-500/40" />
                <span className="text-[11px] font-medium tracking-widest text-white/40 uppercase">
                  First Time Setup
                </span>
              </div>
              <h1 className="text-2xl font-light tracking-tight text-white">
                Register Operator
              </h1>
              <p className="mt-2 text-[13px] text-white/30">
                Create your operational account
              </p>
            </div>

            <form action={formAction} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="displayName"
                  className="block text-[11px] font-medium tracking-widest text-white/30 uppercase"
                >
                  Display Name
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  placeholder="Dr. Myko"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/70 placeholder:text-white/15 transition-colors duration-300 focus:border-emerald-500/30 focus:bg-emerald-500/[0.02] focus:outline-none focus:ring-0"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-[11px] font-medium tracking-widest text-white/30 uppercase"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="operator@mykosphare.io"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/70 placeholder:text-white/15 transition-colors duration-300 focus:border-emerald-500/30 focus:bg-emerald-500/[0.02] focus:outline-none focus:ring-0"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-medium tracking-widest text-white/30 uppercase"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="············"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/70 placeholder:text-white/15 transition-colors duration-300 focus:border-emerald-500/30 focus:bg-emerald-500/[0.02] focus:outline-none focus:ring-0"
                />
                <p className="text-[10px] text-white/20 mt-1">
                  Minimum 6 characters
                </p>
              </div>

              {state?.error && (
                <div className="rounded-lg border border-red-500/15 bg-red-500/[0.03] px-4 py-3">
                  <p className="text-[12px] font-medium tracking-wide text-red-400/80">
                    {state.error}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <SubmitButton />
                <p className="text-center text-[11px] text-white/20">
                  Already registered?{" "}
                  <Link
                    href="/auth/login"
                    className="text-emerald-500/50 hover:text-emerald-400 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </main>

        <footer className="px-6 py-5 sm:px-10">
          <div className="flex flex-col items-center justify-between gap-1 text-[10px] text-white/15 sm:flex-row">
            <span>NA-East / DC-02</span>
            <span>Industrial Biotech · Environmental Intelligence</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
