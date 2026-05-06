import { saveEvent } from "./actions";
import { EVENT_ACCESS_LEVELS, accessLevelLabel } from "@/lib/events/types";
import type { EventRow } from "@/lib/queries/get-events";
import type { EventHostOption, EventTypeOption, EventVenueOption, ZoomConnectionOption } from "@/lib/events/types";
import { ZoomMeetingPicker } from "@/components/admin/events/ZoomMeetingPicker";
import Link from "next/link";

function datetimeLocal(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function hasAccess(event: EventRow | null | undefined, tier: string) {
  return (event?.member_event_access_level ?? []).some((row) => row.subscription_tier === tier);
}

export function EventForm({
  event,
  types,
  hosts,
  venues,
  zoomConnections,
  searchParams,
}: {
  event?: EventRow | null;
  types: EventTypeOption[];
  hosts: EventHostOption[];
  venues: EventVenueOption[];
  zoomConnections: ZoomConnectionOption[];
  searchParams?: { error?: string; success?: string; zoomConnectionId?: string };
}) {
  const selectedZoomConnection =
    searchParams?.zoomConnectionId ?? event?.event_zoom_meeting?.zoom_connection_id ?? "";
  const connectReturn = event?.id
    ? `/admin/events/${event.id}/edit`
    : "/admin/events/new";

  return (
    <form action={saveEvent} className="admin-form-card">
      {event?.id ? <input type="hidden" name="id" value={event.id} /> : null}

      {searchParams?.error ? (
        <div className="admin-banner admin-banner--error">
          {searchParams.error === "access_required"
            ? "Choose at least one membership level."
            : "The event could not be saved. Check required fields and integration settings."}
        </div>
      ) : null}
      {searchParams?.success ? (
        <div className="admin-banner admin-banner--success">Event saved.</div>
      ) : null}

      <div className="admin-form-section">
        <p className="admin-form-section__label">Event details</p>

        <div className="admin-form-field">
          <label htmlFor="title" className="admin-label">
            Title <span className="admin-label__required">*</span>
          </label>
          <input id="title" name="title" required defaultValue={event?.title ?? ""} className="admin-input" />
        </div>

        <div className="admin-form-grid-2">
          <div className="admin-form-field">
            <label htmlFor="type_id" className="admin-label">Event type</label>
            <select id="type_id" name="type_id" defaultValue={event?.type_id ?? types[0]?.id ?? ""} className="admin-select">
              {types.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-field">
            <label htmlFor="status" className="admin-label">Status</label>
            <select id="status" name="status" defaultValue={event?.status ?? "draft"} className="admin-select">
              <option value="draft">Draft</option>
              <option value="ready_for_review">Ready for review</option>
              <option value="published">Published</option>
              <option value="canceled">Canceled</option>
              <option value="postponed">Postponed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="admin-form-field">
          <label htmlFor="excerpt" className="admin-label">Short summary</label>
          <input id="excerpt" name="excerpt" defaultValue={event?.excerpt ?? ""} className="admin-input" />
        </div>

        <div className="admin-form-field">
          <label htmlFor="description" className="admin-label">Description</label>
          <textarea id="description" name="description" rows={5} defaultValue={event?.description ?? event?.body ?? ""} className="admin-textarea" />
        </div>
      </div>

      <div className="admin-form-section">
        <p className="admin-form-section__label">Date & access</p>
        <div className="admin-form-grid-2">
          <div className="admin-form-field">
            <label htmlFor="starts_at" className="admin-label">Start date & time</label>
            <input id="starts_at" name="starts_at" type="datetime-local" required defaultValue={datetimeLocal(event?.starts_at)} className="admin-input" />
          </div>
          <div className="admin-form-field">
            <label htmlFor="ends_at" className="admin-label">End date & time</label>
            <input id="ends_at" name="ends_at" type="datetime-local" required defaultValue={datetimeLocal(event?.ends_at)} className="admin-input" />
          </div>
        </div>

        <div className="admin-form-grid-2">
          <div className="admin-form-field">
            <label htmlFor="timezone" className="admin-label">Timezone</label>
            <input id="timezone" name="timezone" defaultValue={event?.timezone ?? "America/New_York"} className="admin-input" />
          </div>
          <label className="admin-form-field" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <input type="checkbox" name="all_day" defaultChecked={event?.all_day ?? false} style={{ width: "1rem", height: "1rem", accentColor: "var(--color-primary)" }} />
            <span>All-day event</span>
          </label>
        </div>

        <div className="admin-form-field">
          <span className="admin-label">Membership levels with access</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {EVENT_ACCESS_LEVELS.map((level) => (
              <label key={level.value} className="rounded-xl border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="access_levels"
                  value={level.value}
                  defaultChecked={event ? hasAccess(event, level.value) : level.value === "level_2"}
                  style={{ marginRight: "0.5rem", accentColor: "var(--color-primary)" }}
                />
                {accessLevelLabel(level.value)}
              </label>
            ))}
          </div>
        </div>
      </div>

      {!event?.id ? (
        <div className="admin-form-section">
          <p className="admin-form-section__label">Recurrence</p>
          <div className="admin-form-grid-2">
            <div className="admin-form-field">
              <label htmlFor="recurrence_frequency" className="admin-label">Repeat</label>
              <select id="recurrence_frequency" name="recurrence_frequency" defaultValue="none" className="admin-select">
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="admin-form-field">
              <label htmlFor="recurrence_count" className="admin-label">Occurrences</label>
              <input id="recurrence_count" name="recurrence_count" type="number" min="1" max="60" defaultValue="1" className="admin-input" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="admin-form-section">
        <p className="admin-form-section__label">Host & venue</p>
        <div className="admin-form-grid-2">
          <div className="admin-form-field">
            <label htmlFor="host_id" className="admin-label">Reusable host</label>
            <select id="host_id" name="host_id" defaultValue={event?.host_id ?? ""} className="admin-select">
              <option value="">No existing host</option>
              {hosts.map((host) => <option key={host.id} value={host.id}>{host.name}</option>)}
            </select>
          </div>
          <div className="admin-form-field">
            <label htmlFor="host_name" className="admin-label">Or create host</label>
            <input id="host_name" name="host_name" className="admin-input" placeholder="Dr. Paul Jenkins" />
          </div>
        </div>

        <div className="admin-form-grid-2">
          <div className="admin-form-field">
            <label htmlFor="venue_id" className="admin-label">Reusable venue</label>
            <select id="venue_id" name="venue_id" defaultValue={event?.venue_id ?? ""} className="admin-select">
              <option value="">No existing venue</option>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
          </div>
          <div className="admin-form-field">
            <label htmlFor="venue_name" className="admin-label">Or create venue</label>
            <input id="venue_name" name="venue_name" className="admin-input" placeholder="Live On Purpose Studio" />
          </div>
        </div>
        <div className="admin-form-grid-2">
          <input name="venue_address_line1" className="admin-input" placeholder="Address" />
          <input name="venue_city" className="admin-input" placeholder="City" />
          <input name="venue_region" className="admin-input" placeholder="State/Region" />
          <input name="venue_postal_code" className="admin-input" placeholder="Postal code" />
          <input name="venue_country" className="admin-input" placeholder="Country" defaultValue="US" />
          <input name="venue_map_url" className="admin-input" placeholder="Map URL" />
        </div>
      </div>

      <div className="admin-form-section">
        <p className="admin-form-section__label">Virtual event</p>
        <div className="admin-form-grid-2">
          <div className="admin-form-field">
            <label htmlFor="virtual_mode" className="admin-label">Virtual mode</label>
            <select id="virtual_mode" name="virtual_mode" defaultValue={event?.virtual_mode ?? "none"} className="admin-select">
              <option value="none">No virtual link</option>
              <option value="manual">Manual link</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>
          <div className="admin-form-field">
            <label htmlFor="manual_join_url" className="admin-label">Manual join URL</label>
            <input id="manual_join_url" name="manual_join_url" type="url" defaultValue={event?.manual_join_url ?? ""} className="admin-input" />
          </div>
        </div>

        <div className="admin-form-grid-2">
          <div className="admin-form-field">
            <label htmlFor="zoom_mode" className="admin-label">Zoom setup</label>
            <select id="zoom_mode" name="zoom_mode" defaultValue="none" className="admin-select">
              <option value="none">Do not change Zoom link</option>
              <option value="create">Create a new Zoom session on save</option>
              <option value="existing">Use an existing Zoom session</option>
            </select>
          </div>
        </div>

        <ZoomMeetingPicker
          connections={zoomConnections}
          connectReturn={connectReturn}
          defaultConnectionId={selectedZoomConnection}
          defaultObjectType={event?.event_zoom_meeting?.zoom_object_type ?? "meeting"}
        />
      </div>

      <div className="admin-form-section">
        <p className="admin-form-section__label">Replay</p>
        <div className="admin-form-field">
          <label htmlFor="replay_url" className="admin-label">Replay URL</label>
          <input id="replay_url" name="replay_url" type="url" defaultValue={event?.replay_url ?? ""} className="admin-input" />
        </div>
      </div>

      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn--primary">Save event</button>
        <Link href="/admin/events" className="admin-btn admin-btn--outline">Cancel</Link>
      </div>
    </form>
  );
}
