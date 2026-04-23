import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  await requireAdminPermission("members.read");

  const { id } = await context.params;
  const adminQueueUrl = new URL("/admin/beta-feedback", request.url);

  if (!id) {
    adminQueueUrl.searchParams.set("error", "missing_feedback");
    return NextResponse.redirect(adminQueueUrl);
  }

  const adminClient = asLooseSupabaseClient(getAdminClient());
  const { data: feedback, error } = await adminClient
    .from("beta_feedback_submission")
    .select<{ screenshot_storage_path: string | null }>("screenshot_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (error || !feedback?.screenshot_storage_path) {
    adminQueueUrl.searchParams.set("error", "screenshot_unavailable");
    return NextResponse.redirect(adminQueueUrl);
  }

  const signed = await adminClient.storage
    .from("beta-feedback-uploads")
    .createSignedUrl(feedback.screenshot_storage_path, 60);

  if (signed.error || !signed.data?.signedUrl) {
    adminQueueUrl.searchParams.set("error", "screenshot_unavailable");
    return NextResponse.redirect(adminQueueUrl);
  }

  return NextResponse.redirect(signed.data.signedUrl);
}
