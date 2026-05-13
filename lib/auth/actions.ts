"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function login(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const supabase = await createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    if (error.message === "Invalid login credentials") {
      return {
        error: "Invalid email or password. Please verify your credentials and try again.",
      }
    }
    return { error: error.message }
  }

  const next = (formData.get("next") as string) || "/dashboard"
  revalidatePath("/", "layout")
  redirect(next)
}

export async function register(
  _prevState: { error: string | null; success?: boolean } | null,
  formData: FormData
) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const displayName = formData.get("displayName") as string

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  if (password.length < 6) {
    return {
      error: "Password must be at least 6 characters long.",
    }
  }

  if (displayName && displayName.length < 2) {
    return {
      error: "Display name must be at least 2 characters if provided.",
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split("@")[0],
        role: "operator",
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user?.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Please log in instead.",
    }
  }

  if (data.user?.email_confirmed_at) {
    revalidatePath("/", "layout")
    redirect("/dashboard")
  }

  return { error: null, success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/auth/login")
}
