import Link from "next/link";
import { VenueForm } from "../../resource-forms";

export const metadata = {
  title: "New Event Venue - Positives Admin",
};

export default function NewEventVenuePage() {
  return (
    <div style={{ maxWidth: "64rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>New Venue</h1>
          <p className="admin-page-header__subtitle">Create a reusable location for member events.</p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/venues" className="admin-btn admin-btn--outline">Back to venues</Link>
        </div>
      </div>
      <VenueForm returnTo="/admin/events/venues" />
    </div>
  );
}
