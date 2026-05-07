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
  member_event?: {
    id: string;
    title: string;
    starts_at: string;
    status: string;
  } | null;
  event_rsvp_type?: {
    id: string;
    name: string;
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

export async function getAttendeeAdminData(params: AttendeeAdminSearch = {}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const [attendeesResult, eventsResult, rsvpResult] = await Promise.all([
    supabase
      .from("event_attendee")
      .select<AttendeeAdminRow>(
        "id, event_id, rsvp_type_id, member_id, attendee_number, security_code, name, email, purchaser_name, purchaser_email, status, source, created_at, member_event:event_id(id, title, starts_at, status), event_rsvp_type:rsvp_type_id(id, name), event_check_in(id, status, checked_in_at, method)"
      )
      .order("created_at", { ascending: false })
      .limit(500),
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

  const attendees = ((attendeesResult.data ?? []) as unknown as AttendeeAdminRow[]).filter((attendee) => {
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
