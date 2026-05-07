"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { sendEventAttendeeConfirmation } from "@/server/services/events/event-confirmations";

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
  const result = await performEventCheckIn({
    supabase,
    attendeeId,
    eventId,
    checkedInByUserId: user.id,
    method: "manual",
  });

  if (!result.ok) redirectWithStatus(returnTo, result.error, "error");

  revalidatePath("/admin/events/attendees");
  revalidatePath("/admin/events/attendees/check-in");
  revalidatePath(`/admin/events/${eventId}/attendees`);
  redirectWithStatus(returnTo, "checked_in");
}

async function performEventCheckIn({
  supabase,
  attendeeId,
  eventId,
  checkedInByUserId,
  method,
}: {
  supabase: ReturnType<typeof asLooseSupabaseClient>;
  attendeeId: string;
  eventId: string;
  checkedInByUserId: string;
  method: "manual" | "qr";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: attendee, error: attendeeError } = await supabase
    .from("event_attendee")
    .select<{ status: string }>("status")
    .eq("id", attendeeId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (
    attendeeError ||
    !attendee ||
    attendee.status === "canceled" ||
    attendee.status === "refunded" ||
    attendee.status === "chargeback"
  ) {
    return { ok: false, error: "check_in_blocked" };
  }

  const { data: existingCheckIn, error: existingError } = await supabase
    .from("event_check_in")
    .select<{ id: string }>("id")
    .eq("attendee_id", attendeeId)
    .eq("status", "checked_in")
    .maybeSingle();

  if (existingError) return { ok: false, error: "check_in_failed" };
  if (existingCheckIn) return { ok: false, error: "already_checked_in" };

  const { error } = await supabase.from("event_check_in").insert({
    attendee_id: attendeeId,
    event_id: eventId,
    checked_in_by_user_id: checkedInByUserId,
    method,
  });

  if (error) {
    console.error("[checkInEventAttendee]", error.message);
    return { ok: false, error: "check_in_failed" };
  }

  await supabase.from("event_attendee").update({ status: "checked_in" }).eq("id", attendeeId);
  return { ok: true };
}

type LookupAttendeeRow = {
  id: string;
  event_id: string;
  status: string;
};

type LookupResult = { attendee: LookupAttendeeRow } | { error: string };

async function findAttendeeForLookup(
  supabase: ReturnType<typeof asLooseSupabaseClient>,
  lookup: string,
  eventId: string
): Promise<LookupResult> {
  const normalized = lookup.trim();
  if (!normalized) return { error: "lookup_required" as const };
  const escaped = normalized.replaceAll("%", "\\%").replaceAll("_", "\\_");
  let attendeeQuery = supabase
    .from("event_attendee")
    .select<LookupAttendeeRow>("id, event_id, status")
    .or(`security_code.ilike.${escaped},attendee_number.ilike.${escaped},name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
    .limit(3);
  if (eventId) attendeeQuery = attendeeQuery.eq("event_id", eventId);

  const { data: attendees, error: attendeeError } = await attendeeQuery;
  if (attendeeError) {
    console.error("[findAttendeeForLookup] attendee", attendeeError.message);
    return { error: "lookup_failed" as const };
  }
  const attendeeRows = (attendees ?? []) as LookupAttendeeRow[];
  if (attendeeRows.length === 1) return { attendee: attendeeRows[0] };
  if (attendeeRows.length > 1) return { error: "lookup_ambiguous" as const };

  const { data: ticket, error: ticketError } = await supabase
    .from("event_ticket")
    .select<{ id: string }>("id")
    .eq("ticket_code", normalized)
    .maybeSingle();

  if (ticketError) {
    console.error("[findAttendeeForLookup] ticket", ticketError.message);
    return { error: "lookup_failed" as const };
  }
  if (!ticket) return { error: "lookup_not_found" as const };

  let ticketAttendeeQuery = supabase
    .from("event_attendee")
    .select<LookupAttendeeRow>("id, event_id, status")
    .eq("ticket_id", ticket.id)
    .limit(2);
  if (eventId) ticketAttendeeQuery = ticketAttendeeQuery.eq("event_id", eventId);

  const { data: ticketAttendees, error: ticketAttendeeError } = await ticketAttendeeQuery;
  if (ticketAttendeeError) {
    console.error("[findAttendeeForLookup] ticket attendee", ticketAttendeeError.message);
    return { error: "lookup_failed" as const };
  }
  const ticketRows = (ticketAttendees ?? []) as LookupAttendeeRow[];
  if (ticketRows.length === 1) return { attendee: ticketRows[0] };
  if (ticketRows.length > 1) return { error: "lookup_ambiguous" as const };
  return { error: "lookup_not_found" as const };
}

export async function checkInEventAttendeeByLookup(formData: FormData) {
  const user = await requireAdmin();
  const returnTo = safeReturnTo(formData);
  const lookup = clean(formData.get("lookup"));
  const eventId = clean(formData.get("event_id"));
  const supabase = asLooseSupabaseClient(getAdminClient());
  const found = await findAttendeeForLookup(supabase, lookup, eventId);

  if ("error" in found) redirectWithStatus(returnTo, found.error, "error");

  const result = await performEventCheckIn({
    supabase,
    attendeeId: found.attendee.id,
    eventId: found.attendee.event_id,
    checkedInByUserId: user.id,
    method: "manual",
  });

  if (!result.ok) redirectWithStatus(returnTo, result.error, "error");

  revalidatePath("/admin/events/attendees");
  revalidatePath("/admin/events/attendees/check-in");
  revalidatePath(`/admin/events/${found.attendee.event_id}/attendees`);
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
  const attendeeId = clean(formData.get("attendee_id"));
  const eventId = clean(formData.get("event_id"));
  if (!attendeeId || !eventId) redirectWithStatus(returnTo, "attendee_required", "error");

  const result = await sendEventAttendeeConfirmation(attendeeId, { force: true });
  revalidatePath("/admin/events/attendees");
  revalidatePath("/admin/events/attendees/check-in");
  revalidatePath(`/admin/events/${eventId}/attendees`);

  if (!result.ok) redirectWithStatus(returnTo, "confirmation_send_failed", "error");
  redirectWithStatus(returnTo, result.status === "sent" ? "confirmation_sent" : "confirmation_skipped");
}
