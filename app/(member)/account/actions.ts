"use server";

import { formatSupabaseAuthError } from "@/lib/auth/client-error";
import { syncMarketingPreference } from "@/lib/activecampaign/sync";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe/config";

type ActionResult = { error?: string; success?: true };

/**
 * app/(member)/account/actions.ts
 * Server actions for the /account page.
 *
 * setPassword          — set/change password for guest-onboarded members
 * updateTimezone       — save member's preferred timezone
 * redirectToBillingPortal — create a Stripe Customer Portal session and redirect
 * signOut              — sign the current user out and redirect to /login
 */

export async function setPassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const password = formData.get("password") as string | null;
  const confirm = formData.get("confirm") as string | null;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to set a password." };
  }

  const { error: authError } = await supabase.auth.updateUser({ password });
  if (authError) {
    console.error("[Account] updateUser error:", authError.message);
    return { error: formatSupabaseAuthError(authError.message) };
  }

  const { error: memberError } = await supabase
    .from("member")
    .update({ password_set: true })
    .eq("id", user.id);

  if (memberError) {
    console.error("[Account] Failed to set password_set flag:", memberError.message);
  }

  revalidatePath("/account");
  revalidatePath("/today");

  return { success: true };
}

/**
 * updateProfile — update the member-facing display name shown across the app.
 * Email remains the sign-in identifier for now and is intentionally read-only.
 */
export async function updateProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = (formData.get("name") as string | null)?.trim();

  if (!name) {
    return { error: "Please enter your name." };
  }

  if (name.length < 2) {
    return { error: "Name must be at least 2 characters." };
  }

  if (name.length > 80) {
    return { error: "Name must be 80 characters or fewer." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update your profile." };
  }

  const { error } = await supabase
    .from("member")
    .update({ name })
    .eq("id", user.id);

  if (error) {
    console.error("[Account] profile update error:", error.message);
    return { error: "Could not save your profile right now." };
  }

  revalidatePath("/account");
  revalidatePath("/today");

  return { success: true };
}

/**
 * updateTimezone — update member's preferred timezone string.
 * Validates against Intl.supportedValuesOf where available (Node 18+).
 */
export async function updateTimezone(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const tz = (formData.get("timezone") as string | null)?.trim();

  if (!tz) return { error: "Please select a timezone." };

  // Basic validation — prevent arbitrary strings
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    return { error: "Invalid timezone." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("member")
    .update({ timezone: tz })
    .eq("id", user.id);

  if (error) {
    console.error("[Account] timezone update error:", error.message);
    return { error: "Could not save timezone." };
  }

  revalidatePath("/account");
  return { success: true };
}

export async function updateMarketingPreference(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const subscribe = formData.get("subscribe") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update email preferences." };
  }

  const { data: member, error: memberError } = await supabase
    .from("member")
    .update({ email_unsubscribed: !subscribe })
    .eq("id", user.id)
    .select("email")
    .single();

  if (memberError || !member?.email) {
    console.error("[Account] marketing preference update error:", memberError?.message);
    return { error: "Could not update your email preference right now." };
  }

  await syncMarketingPreference({ email: member.email, subscribe });

  revalidatePath("/account");
  return { success: true };
}

/**
 * redirectToBillingPortal — creates a Stripe Customer Portal session for the
 * member's stripe_customer_id and redirects them there.
 *
 * Requires NEXT_PUBLIC_BASE_URL env var for the return URL.
 * Fails gracefully: returns error string rather than throwing.
 */
export async function redirectToBillingPortal(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("member")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!member?.stripe_customer_id) {
    // No Stripe customer yet — should not normally happen for active members
    console.error("[Account] No stripe_customer_id for member:", user.id);
    redirect("/account?error=billing_unavailable");
  }

  const stripe = getStripe();
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://app.getpositives.com";

  const session = await stripe.billingPortal.sessions.create({
    customer: member.stripe_customer_id,
    return_url: `${baseUrl}/account`,
  });

  redirect(session.url);
}

/**
 * signOut — invalidates the Supabase session and redirects to /login.
 * Safe to call with a form action (no return value needed).
 */
export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
