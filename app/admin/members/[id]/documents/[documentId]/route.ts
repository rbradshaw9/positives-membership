import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminRolesForMember } from "@/lib/admin/member-crm";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

const MEMBER_DOCUMENT_BUCKET = "member-documents";

type RouteParams = Promise<{ id: string; documentId: string }>;

function isCoachOnlyRoleSet(roles: { role_key: string }[]) {
  const keys = new Set(roles.map((role) => role.role_key));
  return (
    keys.has("coach") &&
    !keys.has("super_admin") &&
    !keys.has("admin") &&
    !keys.has("support") &&
    !keys.has("readonly")
  );
}

export async function GET(_request: Request, { params }: { params: RouteParams }) {
  const actor = await requireAdminPermission("members.read");
  const { id: memberId, documentId } = await params;
  const supabase = asLooseSupabaseClient(getAdminClient());

  const { data: document, error } = await supabase
    .from("member_document")
    .select<{ id: string; member_id: string; storage_path: string | null; external_url: string | null }>(
      "id, member_id, storage_path, external_url"
    )
    .eq("id", documentId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) {
    console.error("[admin/member-documents] document lookup failed:", error.message);
    return NextResponse.json({ error: "Could not load document." }, { status: 500 });
  }

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const roles = await getAdminRolesForMember(actor.id);
  if (isCoachOnlyRoleSet(roles)) {
    const { data: member } = await supabase
      .from("member")
      .select<{ assigned_coach_id: string | null }>("assigned_coach_id")
      .eq("id", memberId)
      .maybeSingle();

    if (member?.assigned_coach_id !== actor.id) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
  }

  if (!document.storage_path) {
    if (document.external_url) {
      return NextResponse.redirect(document.external_url);
    }
    return NextResponse.json({ error: "No file attached to this document." }, { status: 404 });
  }

  const signed = await supabase.storage
    .from(MEMBER_DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, 60);

  if (signed.error || !signed.data?.signedUrl) {
    console.error("[admin/member-documents] signed URL failed:", signed.error?.message);
    return NextResponse.json({ error: "Could not open document." }, { status: 500 });
  }

  return NextResponse.redirect(signed.data.signedUrl);
}
