import Link from "next/link";
import { HostForm } from "../../resource-forms";

export const metadata = {
  title: "New Event Host - Positives Admin",
};

export default function NewEventHostPage() {
  return (
    <div style={{ maxWidth: "64rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>New Host</h1>
          <p className="admin-page-header__subtitle">Create a reusable organizer profile for event pages.</p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/hosts" className="admin-btn admin-btn--outline">Back to hosts</Link>
        </div>
      </div>
      <HostForm returnTo="/admin/events/hosts" />
    </div>
  );
}
