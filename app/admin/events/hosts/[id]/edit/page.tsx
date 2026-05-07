import { notFound } from "next/navigation";
import Link from "next/link";
import { HostForm } from "../../../resource-forms";
import { getEventSettingsOptions } from "@/lib/queries/get-events";

export const metadata = {
  title: "Edit Event Host - Positives Admin",
};

type Params = Promise<{ id: string }>;

export default async function EditEventHostPage({ params }: { params: Params }) {
  const [{ id }, settings] = await Promise.all([params, getEventSettingsOptions()]);
  const host = settings.hosts.find((host) => host.id === id);
  if (!host) notFound();

  return (
    <div style={{ maxWidth: "64rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>Edit Host</h1>
          <p className="admin-page-header__subtitle">{host.name}</p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/hosts" className="admin-btn admin-btn--outline">Back to hosts</Link>
        </div>
      </div>
      <HostForm host={host} returnTo="/admin/events/hosts" />
    </div>
  );
}
