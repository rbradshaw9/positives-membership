import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export type AttendeeAdminSearch = {
  eventId?: string;
  q?: string;
  status?: string;
  checkIn?: string;
};

export type AttendeeAdminRow = {
  id: string;
  event_id: string;
  rsvp_type_id: string | null;
  member_id: string | null;
  attendee_number: string;
  security_code: string;
  name: string | null;
  email: string | null;
  purchaser_name: string | null;
  purchaser_email: string | null;
  status: string;
  source: string;
  created_at: string;
  custom_field_values: Record<string, unknown>;
  confirmation_sent_at: string | null;
  confirmation_send_attempted_at: string | null;
  confirmation_send_error: string | null;
  confirmation_resend_count: number;
  member_event?: {
    id: string;
    title: string;
    starts_at: string;
    status: string;
  } | null;
  event_rsvp_type?: {
    id: string;
    name: string;
    registration_fields?: Array<{ id: string; label: string }>;
  } | null;
  event_check_in?: Array<{
    id: string;
    status: string;
    checked_in_at: string;
    method: string;
  }>;
};

export type AttendeeEventOption = {
  id: string;
  title: string;
  starts_at: string;
  status: string;
};

export type AttendeeRsvpOption = {
  id: string;
  event_id: string;
  name: string;
  status: string;
};

const ATTENDEE_SELECT =
  "id, event_id, rsvp_type_id, member_id, attendee_number, security_code, name, email, purchaser_name, purchaser_email, status, source, custom_field_values, created_at, confirmation_sent_at, confirmation_send_attempted_at, confirmation_send_error, confirmation_resend_count, member_event:event_id(id, title, starts_at, status), event_rsvp_type:rsvp_type_id(id, name, registration_fields), event_check_in(id, status, checked_in_at, method)";

const ATTENDEE_SELECT_COMPAT =
  "id, event_id, rsvp_type_id, member_id, attendee_number, security_code, name, email, purchaser_name, purchaser_email, status, source, custom_field_values, created_at, member_event:event_id(id, title, starts_at, status), event_rsvp_type:rsvp_type_id(id, name), event_check_in(id, status, checked_in_at, method)";

function normalizeAttendeeRows(rows: unknown[] | null | undefined): AttendeeAdminRow[] {
  return ((rows ?? []) as Partial<AttendeeAdminRow>[]).map((row) => ({
    ...(row as AttendeeAdminRow),
    custom_field_values: row.custom_field_values ?? {},
    confirmation_sent_at: row.confirmation_sent_at ?? null,
    confirmation_send_attempted_at: row.confirmation_send_attempted_at ?? null,
    confirmation_send_error: row.confirmation_send_error ?? null,
    confirmation_resend_count: row.confirmation_resend_count ?? 0,
  }));
}

async function fetchAttendees() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const result = await supabase
    .from("event_attendee")
    .select<AttendeeAdminRow>(ATTENDEE_SELECT)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!result.error || (!result.error.message.includes("confirmation_") && !result.error.message.includes("registration_fields"))) return result;

  const compat = await supabase
    .from("event_attendee")
    .select<AttendeeAdminRow>(ATTENDEE_SELECT_COMPAT)
    .order("created_at", { ascending: false })
    .limit(500);

  return {
    ...compat,
    data: normalizeAttendeeRows(compat.data as unknown[] | null | undefined),
  };
}

export async function getAttendeeAdminData(params: AttendeeAdminSearch = {}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const [attendeesResult, eventsResult, rsvpResult] = await Promise.all([
    fetchAttendees(),
    supabase
      .from("member_event")
      .select<AttendeeEventOption>("id, title, starts_at, status")
      .neq("status", "archived")
      .order("starts_at", { ascending: false })
      .limit(250),
    supabase
      .from("event_rsvp_type")
      .select<AttendeeRsvpOption>("id, event_id, name, status")
      .neq("status", "archived")
      .order("sort_order", { ascending: true }),
  ]);

  if (attendeesResult.error) console.error("[attendees] attendees", attendeesResult.error.message);
  if (eventsResult.error) console.error("[attendees] events", eventsResult.error.message);
  if (rsvpResult.error) console.error("[attendees] rsvps", rsvpResult.error.message);

  const q = params.q?.trim().toLowerCase() ?? "";
  const status = params.status ?? "all";
  const checkIn = params.checkIn ?? "all";
  const eventId = params.eventId ?? "all";

  const attendees = normalizeAttendeeRows(attendeesResult.data as unknown[] | null | undefined).filter((attendee) => {
    const activeCheckIn = attendee.event_check_in?.some((row) => row.status === "checked_in") ?? false;
    const searchable = [
      attendee.name,
      attendee.email,
      attendee.purchaser_name,
      attendee.purchaser_email,
      attendee.attendee_number,
      attendee.security_code,
      attendee.member_event?.title,
      attendee.event_rsvp_type?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (eventId === "all" || attendee.event_id === eventId) &&
      (status === "all" || attendee.status === status) &&
      (checkIn === "all" || (checkIn === "checked_in" ? activeCheckIn : !activeCheckIn)) &&
      (!q || searchable.includes(q))
    );
  });

  return {
    attendees,
    events: (eventsResult.data ?? []) as unknown as AttendeeEventOption[],
    rsvpTypes: (rsvpResult.data ?? []) as unknown as AttendeeRsvpOption[],
  };
}
