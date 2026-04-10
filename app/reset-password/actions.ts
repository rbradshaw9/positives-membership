"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: true };

export async function completePasswordRecovery(
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
    return { error: "This reset link is no longer active. Request a new one and try again." };
  }

  const { error: authError } = await supabase.auth.updateUser({ password });
  if (authError) {
    return { error: authError.message };
  }

  const { error: memberError } = await supabase
    .from("member")
    .update({ password_set: true })
    .eq("id", user.id);

  if (memberError) {
    console.error("[ResetPassword] Failed to persist password_set:", memberError.message);
  }

  revalidatePath("/account");
  revalidatePath("/today");

  return { success: true };
}
