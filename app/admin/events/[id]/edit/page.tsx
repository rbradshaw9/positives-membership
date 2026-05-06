import { notFound } from "next/navigation";
import Link from "next/link";
import { EventForm } from "../../EventForm";
import { archiveEvent } from "../../actions";
import { getAdminEvent, getEventAdminOptions } from "@/lib/queries/get-events";

export const metadata = {
  title: "Edit Event — Positives Admin",
};

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string; success?: string; zoomConnectionId?: string }>;

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const [event, options, resolvedSearchParams] = await Promise.all([
    getAdminEvent(id),
    getEventAdminOptions(),
    searchParams,
  ]);
  if (!event) notFound();

  return (
    <div className="max-w-3xl">
      <div className="admin-breadcrumb">
        <Link href="/admin/events" className="admin-breadcrumb__back">← Events</Link>
      </div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Edit event</h1>
          <p className="admin-page-header__subtitle">{event.title}</p>
        </div>
        <form action={archiveEvent}>
          <input type="hidden" name="id" value={event.id} />
          <button type="submit" className="admin-btn admin-btn--outline">Archive</button>
        </form>
      </div>
      <EventForm event={event} {...options} searchParams={resolvedSearchParams} />
    </div>
  );
}
