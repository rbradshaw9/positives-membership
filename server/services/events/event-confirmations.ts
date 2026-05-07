import { formatEventDateRange } from "@/lib/events/dates";
import { sendPostmarkEmail } from "@/lib/email/postmark";
import { renderEventConfirmationEmail } from "@/lib/email/templates/event-confirmation-email";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import type { EventVenueOption } from "@/lib/events/types";

type EventConfirmationAttendeeRow = {
  id: string;
  event_id: string;
  rsvp_type_id: string | null;
  ticket_type_id: string | null;
  order_id: string | null;
  member_id: string | null;
  attendee_number: string;
  security_code: string;
  name: string | null;
  email: string | null;
  purchaser_name: string | null;
  purchaser_email: string | null;
  status: string;
  source: string;
  confirmation_sent_at?: string | null;
  confirmation_resend_count?: number | null;
};

type EventConfirmationEventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  all_day: boolean;
  virtual_mode: "none" | "manual" | "zoom";
  venue_room_name: string | null;
  event_venue?: EventVenueOption | null;
};

type EventConfirmationResult =
  | { ok: true; status: "sent"; attendeeId: string }
  | { ok: true; status: "skipped"; attendeeId: string; reason: string }
  | { ok: false; status: "failed"; attendeeId: string; error: string };

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://positives.life";
}

function locationLabel(event: EventConfirmationEventRow) {
  if (event.virtual_mode === "zoom") return "Online event. The live link is available from the event page when eligible.";
  if (event.virtual_mode === "manual") return "Online event. Return to the event page for the live link.";
  const venue = event.event_venue;
  if (!venue) return "Location details are available on the event page.";
  const address = [
    venue.name,
    event.venue_room_name,
    venue.address_line1,
    venue.address_line2,
    [venue.city, venue.region, venue.postal_code].filter(Boolean).join(", "),
    venue.country,
  ].filter(Boolean);
  return address.join("\n");
}

const ATTENDEE_CONFIRMATION_SELECT =
  "id, event_id, rsvp_type_id, ticket_type_id, order_id, member_id, attendee_number, security_code, name, email, purchaser_name, purchaser_email, status, source, confirmation_sent_at, confirmation_resend_count";

const ATTENDEE_CONFIRMATION_SELECT_COMPAT =
  "id, event_id, rsvp_type_id, ticket_type_id, order_id, member_id, attendee_number, security_code, name, email, purchaser_name, purchaser_email, status, source";

function registrationLabel({
  rsvpName,
  ticketName,
  attendee,
}: {
  rsvpName?: string | null;
  ticketName?: string | null;
  attendee: EventConfirmationAttendeeRow;
}) {
  if (ticketName) return ticketName;
  if (rsvpName) return rsvpName;
  if (attendee.source === "comp") return "Comp ticket";
  if (attendee.source === "paid") return "Event ticket";
  if (attendee.source === "rsvp") return "RSVP";
  return "Manual registration";
}

async function fetchConfirmationBundle(attendeeId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  let schemaReady = true;
  let attendeeResult = await supabase
    .from("event_attendee")
    .select<EventConfirmationAttendeeRow>(ATTENDEE_CONFIRMATION_SELECT)
    .eq("id", attendeeId)
    .maybeSingle();

  if (attendeeResult.error?.message.includes("confirmation_")) {
    schemaReady = false;
    attendeeResult = await supabase
      .from("event_attendee")
      .select<EventConfirmationAttendeeRow>(ATTENDEE_CONFIRMATION_SELECT_COMPAT)
      .eq("id", attendeeId)
      .maybeSingle();
  }

  const { data: attendee, error: attendeeError } = attendeeResult;
  if (attendeeError || !attendee) {
    throw new Error(attendeeError?.message ?? "Attendee not found.");
  }

  const [eventResult, rsvpResult, ticketTypeResult] = await Promise.all([
    supabase
      .from("member_event")
      .select<EventConfirmationEventRow>(
        "id, title, starts_at, ends_at, timezone, all_day, virtual_mode, venue_room_name, event_venue:venue_id(id, slug, name, description, featured_image_url, address_line1, address_line2, city, region, postal_code, country, email, phone, website_url, map_url, show_map, show_map_link, accessibility_notes, parking_notes, is_virtual, status)"
      )
      .eq("id", attendee.event_id)
      .maybeSingle(),
    attendee.rsvp_type_id
      ? supabase
          .from("event_rsvp_type")
          .select<{ id: string; name: string }>("id, name")
          .eq("id", attendee.rsvp_type_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    attendee.ticket_type_id
      ? supabase
          .from("event_ticket_type")
          .select<{ id: string; name: string }>("id, name")
          .eq("id", attendee.ticket_type_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (eventResult.error || !eventResult.data) {
    throw new Error(eventResult.error?.message ?? "Event not found.");
  }
  if (rsvpResult.error) throw new Error(rsvpResult.error.message);
  if (ticketTypeResult.error) throw new Error(ticketTypeResult.error.message);

  return {
    attendee: attendee as EventConfirmationAttendeeRow,
    event: eventResult.data as unknown as EventConfirmationEventRow,
    rsvpName: rsvpResult.data?.name ?? null,
    ticketName: ticketTypeResult.data?.name ?? null,
    schemaReady,
  };
}

async function recordConfirmationFailure(attendeeId: string, error: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  await supabase
    .from("event_attendee")
    .update({
      confirmation_send_attempted_at: new Date().toISOString(),
      confirmation_send_error: error.slice(0, 1000),
    })
    .eq("id", attendeeId);
}

export async function sendEventAttendeeConfirmation(
  attendeeId: string,
  options: { force?: boolean } = {}
): Promise<EventConfirmationResult> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  let bundle: Awaited<ReturnType<typeof fetchConfirmationBundle>>;

  try {
    bundle = await fetchConfirmationBundle(attendeeId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: "failed", attendeeId, error: message };
  }

  const { attendee, event, rsvpName, ticketName } = bundle;
  if (!bundle.schemaReady) {
    return { ok: true, status: "skipped", attendeeId, reason: "email_status_schema_missing" };
  }
  if (attendee.confirmation_sent_at && !options.force) {
    return { ok: true, status: "skipped", attendeeId, reason: "already_sent" };
  }
  if (["canceled", "refunded", "chargeback"].includes(attendee.status)) {
    return { ok: true, status: "skipped", attendeeId, reason: "inactive_attendee" };
  }

  const recipientEmail = attendee.email || attendee.purchaser_email;
  if (!recipientEmail) {
    await recordConfirmationFailure(attendeeId, "No attendee or purchaser email is available.");
    return { ok: false, status: "failed", attendeeId, error: "No attendee or purchaser email is available." };
  }

  const baseUrl = appUrl();
  const actionPath = attendee.order_id
    ? `/events/${event.id}/orders/${attendee.order_id}`
    : `/events/${event.id}`;
  const rendered = renderEventConfirmationEmail({
    recipientEmail,
    attendeeName: attendee.name || attendee.purchaser_name,
    eventTitle: event.title,
    eventDate: formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day),
    eventLocation: locationLabel(event),
    registrationLabel: registrationLabel({ rsvpName, ticketName, attendee }),
    attendeeNumber: attendee.attendee_number,
    securityCode: attendee.security_code,
    actionUrl: new URL(actionPath, baseUrl).toString(),
    calendarUrl: new URL(`/events/${event.id}/calendar`, baseUrl).toString(),
  });

  try {
    const result = await sendPostmarkEmail({
      to: recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: "event_confirmation",
      idempotencyKey: options.force
        ? `event-attendee-confirmation-${attendeeId}-resend-${(attendee.confirmation_resend_count ?? 0) + 1}`
        : `event-attendee-confirmation-${attendeeId}`,
    });

    const { error: updateError } = await supabase
      .from("event_attendee")
      .update({
        confirmation_sent_at: new Date().toISOString(),
        confirmation_send_attempted_at: new Date().toISOString(),
        confirmation_send_error: null,
        confirmation_message_id: result.messageId,
        confirmation_resend_count: options.force
          ? (attendee.confirmation_resend_count ?? 0) + 1
          : attendee.confirmation_resend_count ?? 0,
      })
      .eq("id", attendeeId);

    if (updateError) throw new Error(updateError.message);
    return { ok: true, status: "sent", attendeeId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordConfirmationFailure(attendeeId, message);
    return { ok: false, status: "failed", attendeeId, error: message };
  }
}

export async function sendEventAttendeeConfirmationSafely(attendeeId: string) {
  const result = await sendEventAttendeeConfirmation(attendeeId);
  if (!result.ok) {
    console.error(`[event confirmation] attendee ${attendeeId}: ${result.error}`);
  }
  return result;
}

export async function sendEventOrderConfirmations(orderId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("event_attendee")
    .select<Array<{ id: string }>>("id")
    .eq("order_id", orderId)
    .in("status", ["registered", "checked_in"]);

  if (error) {
    console.error(`[event confirmation] order ${orderId}: ${error.message}`);
    return [];
  }

  return Promise.all((data ?? []).map((attendee) => sendEventAttendeeConfirmationSafely(attendee.id)));
}
