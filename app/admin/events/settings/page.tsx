import Link from "next/link";
import { saveEventHost, saveEventType, saveEventVenue } from "./actions";
import { getEventSettingsOptions } from "@/lib/queries/get-events";
import type {
  EventHostSettingsRow,
  EventTypeSettingsRow,
  EventVenueSettingsRow,
} from "@/lib/queries/get-events";

export const metadata = {
  title: "Event Settings — Positives Admin",
};

type SearchParams = Promise<{ error?: string; success?: string }>;

const SUCCESS_COPY: Record<string, string> = {
  type_created: "Event type created.",
  type_updated: "Event type updated.",
  host_created: "Host created.",
  host_updated: "Host updated.",
  venue_created: "Venue created.",
  venue_updated: "Venue updated.",
};

const ERROR_COPY: Record<string, string> = {
  type_name_required: "Add a type name before saving.",
  type_save_failed: "The event type could not be saved.",
  host_name_required: "Add a host name before saving.",
  host_save_failed: "The host could not be saved.",
  venue_name_required: "Add a venue name before saving.",
  venue_save_failed: "The venue could not be saved.",
};

function TextInput({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="admin-form-field">
      <span className="admin-label">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="admin-input"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="admin-form-field">
      <span className="admin-label">{label}</span>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="admin-textarea"
      />
    </label>
  );
}

function ActiveToggle({
  active,
  label = "Active",
}: {
  active: boolean;
  label?: string;
}) {
  return (
    <label className="admin-form-field" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
      <input
        type="checkbox"
        name="is_active"
        defaultChecked={active}
        style={{ width: "1rem", height: "1rem", accentColor: "var(--color-primary)" }}
      />
      <span className="admin-label" style={{ margin: 0 }}>{label}</span>
    </label>
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div id={id} className="mb-4 scroll-mt-8">
      <h2 className="admin-page-header__title" style={{ fontSize: "1.55rem", textWrap: "balance" }}>
        {title}
      </h2>
      <p className="admin-page-header__subtitle">{description}</p>
    </div>
  );
}

function TypeForm({ type }: { type?: EventTypeSettingsRow }) {
  return (
    <form action={saveEventType} className="admin-form-card">
      {type?.id ? <input type="hidden" name="id" value={type.id} /> : null}
      <div className="admin-form-grid-2">
        <TextInput label="Name" name="name" required defaultValue={type?.name} placeholder="Workshop" />
        <TextInput label="Slug" name="slug" defaultValue={type?.slug} placeholder="workshop" />
        <TextInput label="Color" name="color" type="color" defaultValue={type?.color ?? "#2EC4B6"} />
        <TextInput label="Sort order" name="sort_order" type="number" defaultValue={type?.sort_order ?? 100} />
      </div>
      <TextInput
        label="Description"
        name="description"
        defaultValue={type?.description}
        placeholder="Guided workshop or practice session."
      />
      <div className="admin-form-actions">
        <ActiveToggle active={type?.is_active ?? true} />
        <button type="submit" className="admin-btn admin-btn--primary">
          {type?.id ? "Save type" : "Create type"}
        </button>
      </div>
    </form>
  );
}

function HostForm({ host }: { host?: EventHostSettingsRow }) {
  return (
    <form action={saveEventHost} className="admin-form-card">
      {host?.id ? <input type="hidden" name="id" value={host.id} /> : null}
      <div className="admin-form-grid-2">
        <TextInput label="Name" name="name" required defaultValue={host?.name} placeholder="Dr. Paul Jenkins" />
        <TextInput label="Email" name="email" type="email" defaultValue={host?.email} placeholder="host@example.com" />
        <TextInput label="Image URL" name="image_url" type="url" defaultValue={host?.image_url} />
        <TextInput label="Website URL" name="website_url" type="url" defaultValue={host?.website_url} />
      </div>
      <TextArea label="Bio" name="bio" defaultValue={host?.bio} placeholder="Short host bio for event detail pages." />
      <div className="admin-form-actions">
        <ActiveToggle active={host?.is_active ?? true} />
        <button type="submit" className="admin-btn admin-btn--primary">
          {host?.id ? "Save host" : "Create host"}
        </button>
      </div>
    </form>
  );
}

function VenueForm({ venue }: { venue?: EventVenueSettingsRow }) {
  return (
    <form action={saveEventVenue} className="admin-form-card">
      {venue?.id ? <input type="hidden" name="id" value={venue.id} /> : null}
      <div className="admin-form-grid-2">
        <TextInput label="Name" name="name" required defaultValue={venue?.name} placeholder="Live On Purpose Studio" />
        <TextInput label="Phone" name="phone" defaultValue={venue?.phone} />
        <TextInput label="Website URL" name="website_url" type="url" defaultValue={venue?.website_url} />
        <TextInput label="Map URL" name="map_url" type="url" defaultValue={venue?.map_url} />
      </div>
      <TextArea label="Description" name="description" defaultValue={venue?.description} />
      <div className="admin-form-grid-2">
        <TextInput label="Address line 1" name="address_line1" defaultValue={venue?.address_line1} />
        <TextInput label="Address line 2" name="address_line2" defaultValue={venue?.address_line2} />
        <TextInput label="City" name="city" defaultValue={venue?.city} />
        <TextInput label="State/Region" name="region" defaultValue={venue?.region} />
        <TextInput label="Postal code" name="postal_code" defaultValue={venue?.postal_code} />
        <TextInput label="Country" name="country" defaultValue={venue?.country ?? "US"} />
        <TextInput label="Latitude" name="latitude" type="number" defaultValue={venue?.latitude} />
        <TextInput label="Longitude" name="longitude" type="number" defaultValue={venue?.longitude} />
      </div>
      <div className="admin-form-actions">
        <ActiveToggle active={venue?.is_active ?? true} />
        <label className="admin-form-field" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <input
            type="checkbox"
            name="is_virtual"
            defaultChecked={venue?.is_virtual ?? false}
            style={{ width: "1rem", height: "1rem", accentColor: "var(--color-primary)" }}
          />
          <span className="admin-label" style={{ margin: 0 }}>Virtual venue</span>
        </label>
        <button type="submit" className="admin-btn admin-btn--primary">
          {venue?.id ? "Save venue" : "Create venue"}
        </button>
      </div>
    </form>
  );
}

export default async function EventSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, settings] = await Promise.all([searchParams, getEventSettingsOptions()]);

  return (
    <div style={{ maxWidth: "92rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>
            Event Settings
          </h1>
          <p className="admin-page-header__subtitle">
            Manage reusable event types, hosts, and venues for the member events calendar.
          </p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events" className="admin-btn admin-btn--outline">Calendar</Link>
          <Link href="/admin/events/new" className="admin-btn admin-btn--primary">New event</Link>
        </div>
      </div>

      {params.success ? (
        <div className="admin-banner admin-banner--success">
          {SUCCESS_COPY[params.success] ?? "Event settings updated."}
        </div>
      ) : null}
      {params.error ? (
        <div className="admin-banner admin-banner--error">
          {ERROR_COPY[params.error] ?? "Event settings could not be saved."}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        <a href="#types" className="admin-btn admin-btn--outline">Types</a>
        <a href="#hosts" className="admin-btn admin-btn--outline">Hosts</a>
        <a href="#venues" className="admin-btn admin-btn--outline">Venues</a>
      </div>

      <section className="mb-10">
        <SectionHeading
          id="types"
          title="Event types"
          description="Use types to describe the event format, such as workshops, Q&As, webinars, and member events."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <TypeForm />
          {settings.types.map((type) => <TypeForm key={type.id} type={type} />)}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading
          id="hosts"
          title="Hosts"
          description="Reusable hosts keep organizer and coach details consistent across events."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <HostForm />
          {settings.hosts.map((host) => <HostForm key={host.id} host={host} />)}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading
          id="venues"
          title="Venues"
          description="Save physical, virtual, and hybrid locations for repeated use in the event editor."
        />
        <div className="grid gap-4">
          <VenueForm />
          {settings.venues.map((venue) => <VenueForm key={venue.id} venue={venue} />)}
        </div>
      </section>
    </div>
  );
}
