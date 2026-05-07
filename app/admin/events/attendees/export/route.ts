import { requireAdmin } from "@/lib/auth/require-admin";
import { getAttendeeAdminData } from "../data";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function activeCheckIn(attendee: Awaited<ReturnType<typeof getAttendeeAdminData>>["attendees"][number]) {
  return attendee.event_check_in?.find((row) => row.status === "checked_in") ?? null;
}

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const data = await getAttendeeAdminData({
    eventId: url.searchParams.get("event_id") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    checkIn: url.searchParams.get("check_in") ?? undefined,
  });

  const rows = [
    [
      "Event",
      "Attendee name",
      "Attendee email",
      "Purchaser name",
      "Purchaser email",
      "Registration",
      "Source",
      "Status",
      "Attendee number",
      "Security code",
      "Checked in",
      "Checked in at",
      "Created at",
    ],
    ...data.attendees.map((attendee) => {
      const checkIn = activeCheckIn(attendee);
      return [
        attendee.member_event?.title ?? "",
        attendee.name ?? "",
        attendee.email ?? "",
        attendee.purchaser_name ?? "",
        attendee.purchaser_email ?? "",
        attendee.event_rsvp_type?.name ?? "",
        attendee.source,
        attendee.status,
        attendee.attendee_number,
        attendee.security_code,
        checkIn ? "yes" : "no",
        checkIn?.checked_in_at ?? "",
        attendee.created_at,
      ];
    }),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "content-disposition": 'attachment; filename="event-attendees.csv"',
      "content-type": "text/csv; charset=utf-8",
    },
  });
}
