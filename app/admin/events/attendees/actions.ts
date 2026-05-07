"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

function clean(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function safeReturnTo(formData: FormData) {
  const raw = clean(formData.get("return_to"));
  return raw.startsWith("/admin/events") && !raw.startsWith("//") ? raw : "/admin/events/attendees";
}

function redirectWithStatus(target: string, status: string, key = "success"): never {
  const url = new URL(target, "https://positives.local");
  url.searchParams.set(key, status);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

export async function addManualEventAttendee(formData: FormData) {
  const user = await requireAdmin();
  const returnTo = safeReturnTo(formData);
  const eventId = clean(formData.get("event_id"));
  if (!eventId) redirectWithStatus(returnTo, "attendee_event_required", "error");

  const memberEmail = clean(formData.get("member_email")).toLowerCase();
  const supabase = asLooseSupabaseClient(getAdminClient());
  let member: { id: string; name: string | null; email: string | null } | null = null;
  if (memberEmail) {
    const { data, error } = await supabase
      .from("member")
      .select<{ id: string; name: string | null; email: string | null }>("id, name, email")
      .eq("email", memberEmail)
      .maybeSingle();
    if (error) console.error("[addManualEventAttendee] member", error.message);
    member = data ?? null;
  }
  const fallbackPurchaserEmail = memberEmail || user.email || null;
  const source = clean(formData.get("source"));
  const safeSource = ["manual", "rsvp", "comp"].includes(source) ? source : "manual";

  const { error } = await supabase.from("event_attendee").insert({
    event_id: eventId,
    rsvp_type_id: clean(formData.get("rsvp_type_id")) || null,
    member_id: member?.id ?? null,
    name: clean(formData.get("attendee_name")) || member?.name || null,
    email: clean(formData.get("attendee_email")) || member?.email || memberEmail || null,
    purchaser_name: member?.name ?? user.email ?? null,
    purchaser_email: member?.email ?? fallbackPurchaserEmail,
    source: safeSource,
    status: "registered",
  });

  if (error) {
    console.error("[addManualEventAttendee]", error.message);
    redirectWithStatus(returnTo, "attendee_save_failed", "error");
  }

  revalidatePath("/admin/events/attendees");
  revalidatePath(`/admin/events/${eventId}/attendees`);
  redirectWithStatus(returnTo, "attendee_added");
}

export async function checkInEventAttendee(formData: FormData) {
  const user = await requireAdmin();
  const returnTo = safeReturnTo(formData);
  const attendeeId = clean(formData.get("attendee_id"));
  const eventId = clean(formData.get("event_id"));
  if (!attendeeId || !eventId) redirectWithStatus(returnTo, "check_in_required", "error");

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: attendee, error: attendeeError } = await supabase
    .from("event_attendee")
    .select<{ status: string }>("status")
    .eq("id", attendeeId)
    .maybeSingle();

  if (attendeeError || !attendee || attendee.status === "canceled" || attendee.status === "refunded") {
    redirectWithStatus(returnTo, "check_in_blocked", "error");
  }

  const { error } = await supabase.from("event_check_in").insert({
    attendee_id: attendeeId,
    event_id: eventId,
    checked_in_by_user_id: user.id,
    method: "manual",
  });

  if (error) {
    console.error("[checkInEventAttendee]", error.message);
    redirectWithStatus(returnTo, "check_in_failed", "error");
  }

  await supabase.from("event_attendee").update({ status: "checked_in" }).eq("id", attendeeId);
  revalidatePath("/admin/events/attendees");
  revalidatePath(`/admin/events/${eventId}/attendees`);
  redirectWithStatus(returnTo, "checked_in");
}

export async function reverseEventCheckIn(formData: FormData) {
  const user = await requireAdmin();
  const returnTo = safeReturnTo(formData);
  const attendeeId = clean(formData.get("attendee_id"));
  const eventId = clean(formData.get("event_id"));
  if (!attendeeId || !eventId) redirectWithStatus(returnTo, "check_in_required", "error");

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase
    .from("event_check_in")
    .update({
      status: "reversed",
      reversed_at: new Date().toISOString(),
      reversed_by_user_id: user.id,
    })
    .eq("attendee_id", attendeeId)
    .eq("status", "checked_in");

  if (error) {
    console.error("[reverseEventCheckIn]", error.message);
    redirectWithStatus(returnTo, "check_in_reverse_failed", "error");
  }

  await supabase.from("event_attendee").update({ status: "registered" }).eq("id", attendeeId);
  revalidatePath("/admin/events/attendees");
  revalidatePath(`/admin/events/${eventId}/attendees`);
  redirectWithStatus(returnTo, "check_in_reversed");
}

export async function cancelEventAttendee(formData: FormData) {
  await requireAdmin();
  const returnTo = safeReturnTo(formData);
  const attendeeId = clean(formData.get("attendee_id"));
  const eventId = clean(formData.get("event_id"));
  if (!attendeeId || !eventId) redirectWithStatus(returnTo, "attendee_required", "error");

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("event_attendee").update({ status: "canceled" }).eq("id", attendeeId);
  if (error) {
    console.error("[cancelEventAttendee]", error.message);
    redirectWithStatus(returnTo, "attendee_cancel_failed", "error");
  }

  revalidatePath("/admin/events/attendees");
  revalidatePath(`/admin/events/${eventId}/attendees`);
  redirectWithStatus(returnTo, "attendee_canceled");
}

export async function resendEventAttendeeConfirmation(formData: FormData) {
  await requireAdmin();
  const returnTo = safeReturnTo(formData);
  redirectWithStatus(returnTo, "confirmation_placeholder");
}
