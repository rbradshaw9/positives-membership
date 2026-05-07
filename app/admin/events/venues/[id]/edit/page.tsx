import { notFound } from "next/navigation";
import Link from "next/link";
import { VenueForm } from "../../../resource-forms";
import { getEventSettingsOptions } from "@/lib/queries/get-events";

export const metadata = {
  title: "Edit Event Venue - Positives Admin",
};

type Params = Promise<{ id: string }>;

export default async function EditEventVenuePage({ params }: { params: Params }) {
  const [{ id }, settings] = await Promise.all([params, getEventSettingsOptions()]);
  const venue = settings.venues.find((venue) => venue.id === id);
  if (!venue) notFound();

  return (
    <div style={{ maxWidth: "64rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>Edit Venue</h1>
          <p className="admin-page-header__subtitle">{venue.name}</p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/venues" className="admin-btn admin-btn--outline">Back to venues</Link>
        </div>
      </div>
      <VenueForm venue={venue} returnTo="/admin/events/venues" />
    </div>
  );
}
