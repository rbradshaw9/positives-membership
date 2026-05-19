import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import type { AdminPermissionKey } from "@/lib/admin/permissions";

export type AdminTeamMemberRow = {
  memberId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  roles: Array<{ id: string; key: string; name: string }>;
  overrides: Array<{ permission: AdminPermissionKey; allowed: boolean }>;
  lastSeenAt: string | null;
};

export async function getAdminTeamMembers(): Promise<AdminTeamMemberRow[]> {
  const supabase = asLooseSupabaseClient(getAdminClient());

  const { data: assignments, error } = await supabase
    .from("admin_user_role")
    .select<
      {
        member_id: string;
        member: { email: string; name: string | null; avatar_url: string | null; last_seen_at: string | null } | null;
        admin_role: { id: string; key: string; name: string } | null;
      }[]
    >("member_id, member(email, name, avatar_url, last_seen_at), admin_role(id, key, name)")
    .order("member_id");

  if (error) {
    console.error("[admin/team] team fetch failed:", error.message);
    return [];
  }

  // Group by member_id
  const byMember = new Map<string, AdminTeamMemberRow>();
  for (const row of assignments ?? []) {
    if (!row.member || !row.admin_role) continue;
    const existing = byMember.get(row.member_id);
    if (existing) {
      existing.roles.push(row.admin_role);
    } else {
      byMember.set(row.member_id, {
        memberId: row.member_id,
        email: row.member.email,
        name: row.member.name,
        avatarUrl: row.member.avatar_url,
        roles: [row.admin_role],
        overrides: [],
        lastSeenAt: row.member.last_seen_at,
      });
    }
  }

  // Load overrides
  if (byMember.size > 0) {
    const { data: overrides } = await supabase
      .from("admin_user_permission_override")
      .select<{ member_id: string; permission: AdminPermissionKey; allowed: boolean }[]>(
        "member_id, permission, allowed"
      )
      .in("member_id", [...byMember.keys()]);

    for (const row of overrides ?? []) {
      const member = byMember.get(row.member_id);
      if (member) {
        member.overrides.push({ permission: row.permission, allowed: row.allowed });
      }
    }
  }

  return [...byMember.values()].sort((a, b) =>
    (a.email ?? "").localeCompare(b.email ?? "")
  );
}
