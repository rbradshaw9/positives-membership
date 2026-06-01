"use server";

import { redirect } from "next/navigation";
import { formatSupabaseAuthError } from "@/lib/auth/client-error";
import { resolvePostLoginDestination } from "@/lib/auth/resolve-post-login-destination";
import { createClient } from "@/lib/supabase/server";

type LoginActionState = {
  error?: string;
};

export async function signInWithPasswordAction(
  _prev: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;
  const next = (formData.get("next") as string | null) ?? "/today";

  if (!email || !password) {
    return { error: "Enter your email and password to sign in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: formatSupabaseAuthError(error.message) };
  }

  const destination = await resolvePostLoginDestination(supabase, next);
  redirect(destination);
}
