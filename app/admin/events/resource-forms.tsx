import type { ReactNode } from "react";
import { saveEventHost, saveEventType, saveEventVenue } from "./settings/actions";
import type {
  EventHostSettingsRow,
  EventTypeSettingsRow,
  EventVenueSettingsRow,
} from "@/lib/queries/get-events";

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

function SelectInput({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="admin-form-field">
      <span className="admin-label">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""} className="admin-select">
        {children}
      </select>
    </label>
  );
}

export function TypeForm({ type, returnTo = "/admin/events/types" }: { type?: EventTypeSettingsRow; returnTo?: string }) {
  return (
    <form action={saveEventType} className="admin-form-card">
      <input type="hidden" name="return_to" value={returnTo} />
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
        <label className="admin-form-field" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={type?.is_active ?? true}
            style={{ width: "1rem", height: "1rem", accentColor: "var(--color-primary)" }}
          />
          <span className="admin-label" style={{ margin: 0 }}>Active</span>
        </label>
        <button type="submit" className="admin-btn admin-btn--primary">
          {type?.id ? "Save type" : "Create type"}
        </button>
      </div>
    </form>
  );
}

export function HostForm({ host, returnTo = "/admin/events/hosts" }: { host?: EventHostSettingsRow; returnTo?: string }) {
  const socials = host?.social_links ?? {};
  return (
    <form action={saveEventHost} className="admin-form-card">
      <input type="hidden" name="return_to" value={returnTo} />
      {host?.id ? <input type="hidden" name="id" value={host.id} /> : null}
      <div className="admin-form-grid-2">
        <TextInput label="Name" name="name" required defaultValue={host?.name} placeholder="Dr. Paul Jenkins" />
        <TextInput label="Slug" name="slug" defaultValue={host?.slug} placeholder="dr-paul-jenkins" />
        <SelectInput label="Host type" name="type" defaultValue={host?.type ?? "person"}>
          <option value="person">Person</option>
          <option value="organization">Organization</option>
          <option value="brand">Brand</option>
          <option value="internal_team">Internal team</option>
        </SelectInput>
        <SelectInput label="Contact visibility" name="contact_visibility" defaultValue={host?.contact_visibility ?? "logged_in"}>
          <option value="public">Public</option>
          <option value="logged_in">Logged-in members</option>
          <option value="private">Private</option>
        </SelectInput>
        <TextInput label="Email" name="email" type="email" defaultValue={host?.email} placeholder="host@example.com" />
        <TextInput label="Phone" name="phone" defaultValue={host?.phone} />
        <TextInput label="Image URL" name="image_url" type="url" defaultValue={host?.image_url} />
        <TextInput label="Logo URL" name="brand_logo_url" type="url" defaultValue={host?.brand_logo_url} />
        <TextInput label="Website URL" name="website_url" type="url" defaultValue={host?.website_url} />
        <TextInput label="Support email" name="support_email" type="email" defaultValue={host?.support_email} />
        <TextInput label="Instagram URL" name="social_instagram" type="url" defaultValue={socials.instagram} />
        <TextInput label="LinkedIn URL" name="social_linkedin" type="url" defaultValue={socials.linkedin} />
        <TextInput label="YouTube URL" name="social_youtube" type="url" defaultValue={socials.youtube} />
        <TextInput label="Facebook URL" name="social_facebook" type="url" defaultValue={socials.facebook} />
      </div>
      <TextArea label="Bio" name="bio" defaultValue={host?.bio} placeholder="Short host bio for event detail pages." />
      <div className="admin-form-actions">
        <SelectInput label="Status" name="status" defaultValue={host?.status ?? "published"}>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </SelectInput>
        <button type="submit" className="admin-btn admin-btn--primary">
          {host?.id ? "Save host" : "Create host"}
        </button>
      </div>
    </form>
  );
}

export function VenueForm({ venue, returnTo = "/admin/events/venues" }: { venue?: EventVenueSettingsRow; returnTo?: string }) {
  return (
    <form action={saveEventVenue} className="admin-form-card">
      <input type="hidden" name="return_to" value={returnTo} />
      {venue?.id ? <input type="hidden" name="id" value={venue.id} /> : null}
      <div className="admin-form-grid-2">
        <TextInput label="Name" name="name" required defaultValue={venue?.name} placeholder="Live On Purpose Studio" />
        <TextInput label="Slug" name="slug" defaultValue={venue?.slug} placeholder="live-on-purpose-studio" />
        <TextInput label="Featured image URL" name="featured_image_url" type="url" defaultValue={venue?.featured_image_url} />
        <TextInput label="Email" name="email" type="email" defaultValue={venue?.email} />
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
      <TextArea label="Parking notes" name="parking_notes" defaultValue={venue?.parking_notes} />
      <TextArea label="Accessibility notes" name="accessibility_notes" defaultValue={venue?.accessibility_notes} />
      <div className="admin-form-actions">
        <SelectInput label="Status" name="status" defaultValue={venue?.status ?? "published"}>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </SelectInput>
        <label className="admin-form-field" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <input
            type="checkbox"
            name="is_virtual"
            defaultChecked={venue?.is_virtual ?? false}
            style={{ width: "1rem", height: "1rem", accentColor: "var(--color-primary)" }}
          />
          <span className="admin-label" style={{ margin: 0 }}>Virtual venue</span>
        </label>
        <label className="admin-form-field" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <input
            type="checkbox"
            name="show_map"
            defaultChecked={venue?.show_map ?? true}
            style={{ width: "1rem", height: "1rem", accentColor: "var(--color-primary)" }}
          />
          <span className="admin-label" style={{ margin: 0 }}>Show map</span>
        </label>
        <label className="admin-form-field" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <input
            type="checkbox"
            name="show_map_link"
            defaultChecked={venue?.show_map_link ?? true}
            style={{ width: "1rem", height: "1rem", accentColor: "var(--color-primary)" }}
          />
          <span className="admin-label" style={{ margin: 0 }}>Show map link</span>
        </label>
        <button type="submit" className="admin-btn admin-btn--primary">
          {venue?.id ? "Save venue" : "Create venue"}
        </button>
      </div>
    </form>
  );
}
