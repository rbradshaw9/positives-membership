import Link from "next/link";
import { EventForm } from "../EventForm";
import { getEventAdminOptions } from "@/lib/queries/get-events";

export const metadata = {
  title: "New Event — Positives Admin",
};

type SearchParams = Promise<{ error?: string; success?: string; zoomConnectionId?: string; starts_at?: string }>;

export default async function NewEventPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const options = await getEventAdminOptions();

  return (
    <div className="max-w-3xl">
      <div className="admin-breadcrumb">
        <Link href="/admin/events" className="admin-breadcrumb__back">← Events</Link>
      </div>
      <div className="admin-page-header">
        <h1 className="admin-page-header__title">New event</h1>
        <p className="admin-page-header__subtitle">Create a member-only event with selected membership access.</p>
      </div>
      <EventForm {...options} searchParams={params} />
    </div>
  );
}
