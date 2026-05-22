import type { User } from "@supabase/supabase-js";
import { isBootstrapAdminEmail } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

type AdminApiAuth =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; error: string };

export async function getAdminApiAuth(): Promise<AdminApiAuth> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  if (isBootstrapAdminEmail(user.email)) {
    return { ok: true, user };
  }

  const admin = asLooseSupabaseClient(getAdminClient());
  const { data, error: roleError } = await admin
    .from("admin_user_role")
    .select<{ role_id: string }[]>("role_id")
    .eq("member_id", user.id)
    .limit(1);

  if (roleError) {
    console.error("[admin-api] role lookup failed:", roleError.message);
    return { ok: false, status: 403, error: "Admin access required" };
  }

  if (!data?.length) {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return { ok: true, user };
}
