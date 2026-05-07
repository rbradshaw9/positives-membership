import { AttendeeManagement } from "./AttendeeManagement";
import { getAttendeeAdminData } from "./data";

export const metadata = {
  title: "Event Attendees - Positives Admin",
};

type SearchParams = Promise<{
  event_id?: string;
  q?: string;
  status?: string;
  check_in?: string;
  success?: string;
  error?: string;
}>;

export default async function EventAttendeesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const data = await getAttendeeAdminData({
    eventId: params.event_id,
    q: params.q,
    status: params.status,
    checkIn: params.check_in,
  });

  return (
    <AttendeeManagement
      attendees={data.attendees}
      events={data.events}
      rsvpTypes={data.rsvpTypes}
      params={{
        eventId: params.event_id,
        q: params.q,
        status: params.status,
        checkIn: params.check_in,
        success: params.success,
        error: params.error,
      }}
    />
  );
}
