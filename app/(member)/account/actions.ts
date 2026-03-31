"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { error?: string; success?: true };

/**
 * app/(member)/account/actions.ts
 * Server actions for the /account page.
 *
 * setPassword — allows a guest-onboarded member to set a password for
 *   future email+password sign-ins. On success:
 *   1. Updates auth.users via supabase.auth.updateUser({ password })
 *   2. Sets member.password_set = true
 *   3. Revalidates /account so the nudge banner disappears on next nav
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

  // 1. Verify session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to set a password." };
  }

  // 2. Update auth password
  const { error: authError } = await supabase.auth.updateUser({ password });
  if (authError) {
    console.error("[Account] updateUser error:", authError.message);
    return { error: authError.message };
  }

  // 3. Mark password_set in member row
  const { error: memberError } = await supabase
    .from("member")
    .update({ password_set: true })
    .eq("id", user.id);

  if (memberError) {
    // Non-fatal: auth password was set successfully, just log this
    console.error("[Account] Failed to set password_set flag:", memberError.message);
  }

  // 4. Revalidate so layout re-fetches password_set and hides the nudge
  revalidatePath("/account");
  revalidatePath("/today");

  return { success: true };
}
