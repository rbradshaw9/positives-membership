"use server";

import { randomUUID } from "node:crypto";
import { formatSupabaseAuthError } from "@/lib/auth/client-error";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { createBillingPortalSessionUrl } from "@/server/services/stripe/create-billing-portal-session";

type ActionResult = { error?: string; success?: true };
const MEMBER_AVATAR_BUCKET = "member-avatars";
const MAX_MEMBER_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_MEMBER_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getUploadedFile(formData: FormData, key: string) {
  const value = formData.get(key);
  if (value instanceof File && value.size > 0) return value;
  return null;
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return cleaned || "avatar";
}

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

  let avatarUrl: string | null = null;
  const avatarFile = getUploadedFile(formData, "avatarFile");
  if (avatarFile) {
    if (!ALLOWED_MEMBER_AVATAR_TYPES.has(avatarFile.type)) {
      return { error: "Avatar must be a JPEG, PNG, WebP, or GIF image." };
    }

    if (avatarFile.size > MAX_MEMBER_AVATAR_BYTES) {
      return { error: "Avatar image must be 3 MB or smaller." };
    }

    const adminClient = asLooseSupabaseClient(getAdminClient());
    const avatarPath = `${user.id}/${randomUUID()}-${sanitizeFileName(avatarFile.name)}`;
    const { error: uploadError } = await adminClient.storage
      .from(MEMBER_AVATAR_BUCKET)
      .upload(avatarPath, avatarFile, {
        contentType: avatarFile.type,
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      console.error("[Account] avatar upload error:", uploadError.message);
      return { error: "Could not upload your profile photo right now." };
    }

    const { data: publicUrlData } = adminClient.storage
      .from(MEMBER_AVATAR_BUCKET)
      .getPublicUrl(avatarPath);
    avatarUrl = publicUrlData.publicUrl;
  }

  const updates = {
    name,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
  };

  const { error } = await supabase
    .from("member")
    .update(updates)
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

/**
 * redirectToBillingPortal — creates a Stripe Customer Portal session for the
 * member's stripe_customer_id and redirects them there.
 *
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

  const portal = await createBillingPortalSessionUrl(
    member.stripe_customer_id,
    `${config.app.url}/account`
  );

  if (portal.ok) {
    redirect(portal.url);
  }

  if (portal.reason === "customer_missing") {
    console.warn("[Account] Stripe customer is missing for member:", user.id);
    redirect("/account?error=billing_unavailable");
  }

  console.error("[Account] Failed to create billing portal session:", portal.message);
  redirect("/account?error=billing_unavailable");
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
