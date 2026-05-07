import { notFound } from "next/navigation";
import { AttendeeManagement } from "../../attendees/AttendeeManagement";
import { getAttendeeAdminData } from "../../attendees/data";
import { getAdminEvent } from "@/lib/queries/get-events";

export const metadata = {
  title: "Event Attendees - Positives Admin",
};

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  q?: string;
  status?: string;
  check_in?: string;
  success?: string;
  error?: string;
}>;

export default async function EventScopedAttendeesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const [event, data] = await Promise.all([
    getAdminEvent(id),
    getAttendeeAdminData({
      eventId: id,
      q: resolvedSearchParams.q,
      status: resolvedSearchParams.status,
      checkIn: resolvedSearchParams.check_in,
    }),
  ]);
  if (!event) notFound();

  return (
    <AttendeeManagement
      attendees={data.attendees}
      events={data.events}
      rsvpTypes={data.rsvpTypes}
      lockedEventId={id}
      title="Event Attendees"
      subtitle={event.title}
      params={{
        eventId: id,
        q: resolvedSearchParams.q,
        status: resolvedSearchParams.status,
        checkIn: resolvedSearchParams.check_in,
        success: resolvedSearchParams.success,
        error: resolvedSearchParams.error,
      }}
    />
  );
}
