"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createCheckoutSession } from "@/server/services/stripe/create-checkout-session";

/**
 * app/join/actions.ts
 * Server Actions for the /join page.
 *
 * signUpAndJoin — email/password signup for new users.
 *   1. Creates a Supabase account (signUp)
 *   2. If the member row exists and user is already confirmed, proceeds to checkout
 *   3. If email confirmation is required, redirects to /join?step=check-email
 *
 * signInAndJoin — password sign-in for returning users who are not yet members.
 *   Used when someone already has an account but their subscription is inactive.
 *
 * startCheckout — used when visitor is already authenticated + inactive.
 *   Skips auth entirely and proceeds straight to Stripe Checkout.
 *
 * All actions return { error: string } on failure, allowing the client
 * component to surface the message via useActionState.
 */

type ActionResult = { error?: string };

// ── New user: sign up with email + password ────────────────────────────────────
export async function signUpAndJoin(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;
  const priceId = (formData.get("priceId") as string | null) ?? undefined;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();

  // Attempt signup. If the email already exists, signUp returns a user
  // but no new account is created — treat this as a "wrong password" case.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // emailRedirectTo is only used if email confirmation is enabled.
      // We recommend turning confirmation OFF for launch to reduce friction.
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback?next=/join`,
    },
  });

  if (error) {
    console.error("[Join] signUp error:", error.message);
    return { error: error.message };
  }

  // Supabase returns a session immediately when email confirmation is disabled.
  // If session is null, confirmation email was sent — redirect to inform user.
  if (!data.session) {
    // Email confirmation is enabled — redirect to check-email step
    redirect(`/join?step=check-email&email=${encodeURIComponent(email)}`);
  }

  // Session established — proceed straight to checkout
  const user = data.user!;
  try {
    const { url } = await createCheckoutSession(user.id, user.email!, priceId);
    redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Join] Checkout creation failed after signup:", message);
    return { error: "Could not start checkout. Please try again." };
  }
}

// ── Returning user: sign in with email + password ────────────────────────────
export async function signInAndJoin(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;
  const priceId = (formData.get("priceId") as string | null) ?? undefined;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[Join] signIn error:", error.message);
    // Translate Supabase's generic message into something human-readable
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return { error: "Incorrect email or password. Try again." };
    }
    return { error: error.message };
  }

  const user = data.user;
  if (!user?.email) {
    return { error: "Sign-in succeeded but no user session found." };
  }

  // Check if already active
  const { data: member } = await supabase
    .from("member")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (member?.subscription_status === "active") {
    redirect("/today");
  }

  // Inactive — proceed to checkout
  try {
    const { url } = await createCheckoutSession(user.id, user.email, priceId);
    redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Join] Checkout creation failed after sign-in:", message);
    return { error: "Could not start checkout. Please try again." };
  }
}

// ── Already authenticated + inactive: skip auth, go straight to checkout ─────
export async function startCheckoutAuthenticated(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const priceId = (formData.get("priceId") as string | null) ?? undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/join");
  }

  try {
    const { url } = await createCheckoutSession(user.id, user.email, priceId);
    redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Join] Checkout creation failed (authenticated):", message);
    return { error: "Could not start checkout. Please try again." };
  }
}

// ── Send magic link (secondary option) ───────────────────────────────────────
export async function sendMagicLinkForJoin(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = (formData.get("email") as string | null)?.trim();

  if (!email) {
    return { error: "Email address is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback?next=/join`,
    },
  });

  if (error) {
    console.error("[Join] Magic link error:", error.message);
    return { error: error.message };
  }

  redirect(`/join?step=check-email&email=${encodeURIComponent(email)}`);
}
