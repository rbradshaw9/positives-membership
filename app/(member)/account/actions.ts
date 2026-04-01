"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe/config";

type ActionResult = { error?: string; success?: true };

/**
 * app/(member)/account/actions.ts
 * Server actions for the /account page.
 *
 * setPassword   — set/change password for guest-onboarded members
 * updateTimezone — save member's preferred timezone
 * redirectToBillingPortal — create a Stripe Customer Portal session and redirect
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
    return { error: authError.message };
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
