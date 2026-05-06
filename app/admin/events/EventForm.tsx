"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { formatInTimeZone } from "date-fns-tz";
import {
  createInlineEventHost,
  createInlineEventType,
  createInlineEventVenue,
  saveEvent,
} from "./actions";
import { EVENT_ACCESS_LEVELS, accessLevelLabel } from "@/lib/events/types";
import type {
  EventHostOption,
  EventTypeOption,
  EventVenueOption,
  ZoomConnectionOption,
} from "@/lib/events/types";
import type { EventRow } from "@/lib/queries/get-events";
import { ZoomMeetingPicker } from "@/components/admin/events/ZoomMeetingPicker";
import { EventDetailsEditor } from "@/components/admin/events/EventDetailsEditor";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

type SearchParams = { error?: string; success?: string; zoomConnectionId?: string };
type ModalKind = "type" | "host" | "venue" | null;

function datetimeLocal(value?: string | null, timezone = "America/New_York") {
  if (!value) return "";
  return formatInTimeZone(new Date(value), timezone, "yyyy-MM-dd'T'HH:mm");
}

function hasAccess(event: EventRow | null | undefined, tier: string) {
  return (event?.member_event_access_level ?? []).some((row) => row.subscription_tier === tier);
}

function statusLabel(status?: string | null) {
  if (status === "published") return "Published";
  if (status === "ready_for_review") return "Ready for review";
  return "Draft";
}

function successMessage(success?: string) {
  if (success === "published") return "Event published. Eligible members can now see it.";
  if (success === "unpublished") return "Event unpublished. Members can no longer see it.";
  if (success === "draft_saved") return "Draft saved. Members will not see this event until it is published.";
  return success ? "Event saved." : null;
}

function errorMessage(error?: string) {
  if (error === "access_required") return "Choose at least one membership level.";
  if (error === "title_required") return "Add a title before saving.";
  if (error === "zoom_create_failed") return "Zoom could not create the session. The event was kept as a draft.";
  return error ? "The event could not be saved. Check required fields and integration settings." : null;
}

function FieldSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-form-section">
      <h2 className="admin-form-section__label" style={{ textWrap: "balance" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function InlineModal({
  kind,
  onClose,
  onCreateType,
  onCreateHost,
  onCreateVenue,
  pending,
  error,
}: {
  kind: Exclude<ModalKind, null>;
  onClose: () => void;
  onCreateType: (formData: FormData) => void;
  onCreateHost: (formData: FormData) => void;
  onCreateVenue: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
}) {
  const title =
    kind === "type" ? "Create event type" : kind === "host" ? "Create host" : "Create venue";
  const submit = kind === "type" ? onCreateType : kind === "host" ? onCreateHost : onCreateVenue;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="event-inline-modal-title">
      <form
        action={submit}
        className="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="event-inline-modal-title" className="font-heading text-xl font-semibold text-foreground" style={{ textWrap: "balance" }}>
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the essentials now. You can refine details later in Event Settings.
            </p>
          </div>
          <button type="button" onClick={onClose} className="admin-btn admin-btn--outline">
            Close
          </button>
        </div>

        {error ? <div className="admin-banner admin-banner--error">{error}</div> : null}

        <div className="grid gap-4">
          <div className="admin-form-field">
            <label htmlFor="inline_name" className="admin-label">Name</label>
            <input id="inline_name" name="name" required className="admin-input" autoFocus />
          </div>

          {kind === "type" ? (
            <>
              <div className="admin-form-field">
                <label htmlFor="inline_color" className="admin-label">Color</label>
                <input id="inline_color" name="color" type="color" defaultValue="#2EC4B6" className="admin-input h-12" />
              </div>
              <div className="admin-form-field">
                <label htmlFor="inline_description" className="admin-label">Description</label>
                <textarea id="inline_description" name="description" rows={3} className="admin-textarea" />
              </div>
            </>
          ) : null}

          {kind === "host" ? (
            <>
              <div className="admin-form-field">
                <label htmlFor="inline_email" className="admin-label">Email</label>
                <input id="inline_email" name="email" type="email" className="admin-input" />
              </div>
              <div className="admin-form-field">
                <label htmlFor="inline_image_url" className="admin-label">Image URL</label>
                <input id="inline_image_url" name="image_url" type="url" className="admin-input" />
              </div>
              <div className="admin-form-field">
                <label htmlFor="inline_bio" className="admin-label">Bio</label>
                <textarea id="inline_bio" name="bio" rows={3} className="admin-textarea" />
              </div>
            </>
          ) : null}

          {kind === "venue" ? (
            <>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input name="is_virtual" type="checkbox" className="h-4 w-4" />
                Virtual venue
              </label>
              <div className="admin-form-grid-2">
                <input name="address_line1" className="admin-input" placeholder="Address" />
                <input name="city" className="admin-input" placeholder="City" />
                <input name="region" className="admin-input" placeholder="State/Region" />
                <input name="postal_code" className="admin-input" placeholder="Postal code" />
                <input name="country" className="admin-input" placeholder="Country" defaultValue="US" />
                <input name="map_url" className="admin-input" placeholder="Map URL" />
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="admin-btn admin-btn--outline">Cancel</button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
            {pending ? "Creating..." : "Create and select"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function EventForm({
  event,
  types: initialTypes,
  hosts: initialHosts,
  venues: initialVenues,
  zoomConnections,
  searchParams,
}: {
  event?: EventRow | null;
  types: EventTypeOption[];
  hosts: EventHostOption[];
  venues: EventVenueOption[];
  zoomConnections: ZoomConnectionOption[];
  searchParams?: SearchParams;
}) {
  const [types, setTypes] = useState(initialTypes);
  const [hosts, setHosts] = useState(initialHosts);
  const [venues, setVenues] = useState(initialVenues);
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const initialTimezone = event?.timezone ?? "America/New_York";
  const [title, setTitle] = useState(event?.title ?? "");
  const [typeId, setTypeId] = useState(event?.type_id ?? initialTypes[0]?.id ?? "");
  const [hostId, setHostId] = useState(event?.host_id ?? "");
  const [venueId, setVenueId] = useState(event?.venue_id ?? "");
  const [timezone, setTimezone] = useState(initialTimezone);
  const [startsAt, setStartsAt] = useState(datetimeLocal(event?.starts_at, initialTimezone));
  const [endsAt, setEndsAt] = useState(datetimeLocal(event?.ends_at, initialTimezone));
  const [virtualMode, setVirtualMode] = useState(event?.virtual_mode ?? "none");
  const [zoomMode, setZoomMode] = useState("none");
  const [recurrence, setRecurrence] = useState("none");
  const [accessLevels, setAccessLevels] = useState<string[]>(
    EVENT_ACCESS_LEVELS
      .filter((level) => (event ? hasAccess(event, level.value) : level.value === "level_2"))
      .map((level) => level.value)
  );

  const selectedZoomConnection =
    searchParams?.zoomConnectionId ?? event?.event_zoom_meeting?.zoom_connection_id ?? "";
  const connectReturn = event?.id ? `/admin/events/${event.id}/edit` : "/admin/events/new";
  const currentStatus = event?.status ?? "draft";
  const published = currentStatus === "published";
  const message = successMessage(searchParams?.success);
  const error = errorMessage(searchParams?.error);
  const selectedAccessText = useMemo(
    () => accessLevels.map(accessLevelLabel).join(", ") || "No levels selected",
    [accessLevels]
  );

  function toggleAccess(value: string) {
    setAccessLevels((current) =>
      current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]
    );
  }

  function openModal(kind: ModalKind) {
    setModalError(null);
    setModal(kind);
  }

  function createType(formData: FormData) {
    startTransition(async () => {
      const result = await createInlineEventType({
        name: String(formData.get("name") ?? ""),
        color: String(formData.get("color") ?? ""),
        description: String(formData.get("description") ?? ""),
      });
      if (!result.ok) {
        setModalError(result.error);
        return;
      }
      setTypes((current) => [...current, result.item]);
      setTypeId(result.item.id);
      setModal(null);
    });
  }

  function createHost(formData: FormData) {
    startTransition(async () => {
      const result = await createInlineEventHost({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        image_url: String(formData.get("image_url") ?? ""),
        bio: String(formData.get("bio") ?? ""),
      });
      if (!result.ok) {
        setModalError(result.error);
        return;
      }
      setHosts((current) => [...current, result.item]);
      setHostId(result.item.id);
      setModal(null);
    });
  }

  function createVenue(formData: FormData) {
    startTransition(async () => {
      const result = await createInlineEventVenue({
        name: String(formData.get("name") ?? ""),
        is_virtual: formData.get("is_virtual") === "on",
        address_line1: String(formData.get("address_line1") ?? ""),
        city: String(formData.get("city") ?? ""),
        region: String(formData.get("region") ?? ""),
        postal_code: String(formData.get("postal_code") ?? ""),
        country: String(formData.get("country") ?? ""),
        map_url: String(formData.get("map_url") ?? ""),
      });
      if (!result.ok) {
        setModalError(result.error);
        return;
      }
      setVenues((current) => [...current, result.item]);
      setVenueId(result.item.id);
      setModal(null);
    });
  }

  return (
    <>
      <form action={saveEvent} className="admin-form-card pb-28">
        {event?.id ? <input type="hidden" name="id" value={event.id} /> : null}
        <input type="hidden" name="current_status" value={currentStatus} />

        {error ? <div className="admin-banner admin-banner--error">{error}</div> : null}
        {message ? <div className="admin-banner admin-banner--success">{message}</div> : null}

        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Member visibility</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                {statusLabel(currentStatus)}
              </h2>
            </div>
            <div className="grid gap-1 text-sm text-muted-foreground md:text-right">
              <span>{selectedAccessText}</span>
              <span>{startsAt || "No start time selected"}</span>
              <span>{virtualMode === "none" ? "No join link" : virtualMode === "manual" ? "Manual join link" : "Zoom event"}</span>
            </div>
          </div>
        </div>

        <FieldSection title="Basics">
          <div className="admin-form-field">
            <label htmlFor="title" className="admin-label">
              Title <span className="admin-label__required">*</span>
            </label>
            <input id="title" name="title" required value={title} onChange={(event) => setTitle(event.target.value)} className="admin-input" />
          </div>

          <div className="admin-form-grid-2">
            <div className="admin-form-field">
              <label htmlFor="type_id" className="admin-label">Event type</label>
              <select
                id="type_id"
                name="type_id"
                value={typeId}
                onChange={(event) => event.target.value === "__create" ? openModal("type") : setTypeId(event.target.value)}
                className="admin-select"
              >
                {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                <option value="__create">Create new event type...</option>
              </select>
            </div>

            <div className="admin-form-field">
              <label htmlFor="excerpt" className="admin-label">Short summary</label>
              <input id="excerpt" name="excerpt" defaultValue={event?.excerpt ?? ""} className="admin-input" />
            </div>
          </div>

          <div className="admin-form-field">
            <label className="admin-label">Event details</label>
            <EventDetailsEditor defaultValue={event?.body ?? event?.description ?? ""} />
            <p className="admin-hint">Supports formatted text, links, images, and safe HTML. Scripts and unsafe tags are removed on save.</p>
          </div>
        </FieldSection>

        <FieldSection title="Schedule & access">
          <div className="admin-form-grid-2">
            <div className="admin-form-field">
              <label htmlFor="starts_at" className="admin-label">Start date & time</label>
              <input id="starts_at" name="starts_at" type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="admin-input" />
            </div>
            <div className="admin-form-field">
              <label htmlFor="ends_at" className="admin-label">End date & time</label>
              <input id="ends_at" name="ends_at" type="datetime-local" required value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="admin-input" />
            </div>
          </div>

          <div className="admin-form-grid-2">
            <div className="admin-form-field">
              <label htmlFor="timezone" className="admin-label">Timezone</label>
              <select id="timezone" name="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} className="admin-select">
                {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
              <input type="checkbox" name="all_day" defaultChecked={event?.all_day ?? false} className="h-4 w-4" />
              All-day event
            </label>
          </div>

          {!event?.id ? (
            <div className="admin-form-grid-2">
              <div className="admin-form-field">
                <label htmlFor="recurrence_frequency" className="admin-label">Repeat</label>
                <select id="recurrence_frequency" name="recurrence_frequency" value={recurrence} onChange={(event) => setRecurrence(event.target.value)} className="admin-select">
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {recurrence !== "none" ? (
                <>
                  <div className="admin-form-field">
                    <label htmlFor="recurrence_count" className="admin-label">Occurrences</label>
                    <input id="recurrence_count" name="recurrence_count" type="number" min="1" max="50" defaultValue="4" className="admin-input" />
                  </div>
                  <div className="admin-form-field">
                    <label htmlFor="recurrence_until" className="admin-label">End by</label>
                    <input id="recurrence_until" name="recurrence_until" type="date" className="admin-input" />
                    <p className="admin-hint">Optional. Leave blank to use the occurrence count.</p>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="admin-form-field">
            <span className="admin-label">Membership levels with access</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {EVENT_ACCESS_LEVELS.map((level) => (
                <label key={level.value} className="rounded-xl border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="access_levels"
                    value={level.value}
                    checked={accessLevels.includes(level.value)}
                    onChange={() => toggleAccess(level.value)}
                    className="mr-2 h-4 w-4"
                  />
                  {level.label}
                </label>
              ))}
            </div>
            <p className="admin-hint">Selected levels can see this event after it is published.</p>
          </div>
        </FieldSection>

        <FieldSection title="Location">
          <div className="admin-form-grid-2">
            <div className="admin-form-field">
              <label htmlFor="host_id" className="admin-label">Host</label>
              <select id="host_id" name="host_id" value={hostId} onChange={(event) => event.target.value === "__create" ? openModal("host") : setHostId(event.target.value)} className="admin-select">
                <option value="">No host</option>
                {hosts.map((host) => <option key={host.id} value={host.id}>{host.name}</option>)}
                <option value="__create">Create new host...</option>
              </select>
            </div>

            <div className="admin-form-field">
              <label htmlFor="venue_id" className="admin-label">Venue</label>
              <select id="venue_id" name="venue_id" value={venueId} onChange={(event) => event.target.value === "__create" ? openModal("venue") : setVenueId(event.target.value)} className="admin-select">
                <option value="">No venue</option>
                {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
                <option value="__create">Create new venue...</option>
              </select>
            </div>
          </div>
          <Link href="/admin/events/settings#hosts" className="text-xs font-semibold text-primary">
            Manage full event settings
          </Link>
        </FieldSection>

        <FieldSection title="Virtual / Zoom">
          <div className="admin-form-grid-2">
            <div className="admin-form-field">
              <label htmlFor="virtual_mode" className="admin-label">Virtual mode</label>
              <select id="virtual_mode" name="virtual_mode" value={virtualMode} onChange={(event) => setVirtualMode(event.target.value as EventRow["virtual_mode"])} className="admin-select">
                <option value="none">No virtual link</option>
                <option value="manual">Manual link</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>
            {virtualMode === "manual" ? (
              <div className="admin-form-field">
                <label htmlFor="manual_join_url" className="admin-label">Manual join URL</label>
                <input id="manual_join_url" name="manual_join_url" type="url" defaultValue={event?.manual_join_url ?? ""} className="admin-input" />
              </div>
            ) : null}
          </div>

          {virtualMode === "zoom" ? (
            <div className="grid gap-4">
              <div className="admin-form-field">
                <label htmlFor="zoom_mode" className="admin-label">Zoom setup</label>
                <select id="zoom_mode" name="zoom_mode" value={zoomMode} onChange={(event) => setZoomMode(event.target.value)} className="admin-select">
                  <option value="none">Do not change Zoom link</option>
                  <option value="create">Create a new Zoom session on save</option>
                  <option value="existing">Use an existing Zoom session</option>
                </select>
                {zoomMode === "create" ? (
                  <p className="admin-hint">Zoom will be created when this event is saved or published. Recurring events use one shared Zoom series.</p>
                ) : null}
              </div>
              {zoomMode !== "none" ? (
                <ZoomMeetingPicker
                  key={zoomMode}
                  connections={zoomConnections}
                  connectReturn={connectReturn}
                  defaultConnectionId={selectedZoomConnection}
                  defaultObjectType={event?.event_zoom_meeting?.zoom_object_type ?? "meeting"}
                  mode={zoomMode === "existing" ? "existing" : "create"}
                />
              ) : null}
            </div>
          ) : null}
        </FieldSection>

        <FieldSection title="Replay">
          <div className="admin-form-field">
            <label htmlFor="replay_url" className="admin-label">Replay URL</label>
            <input id="replay_url" name="replay_url" type="url" defaultValue={event?.replay_url ?? ""} className="admin-input" />
          </div>
        </FieldSection>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2">
            <Link href="/admin/events" className="admin-btn admin-btn--outline">Cancel</Link>
            {published ? (
              <>
                <button type="submit" name="intent" value="unpublish" className="admin-btn admin-btn--outline">Unpublish</button>
                <button type="submit" name="intent" value="save" className="admin-btn admin-btn--primary">Save changes</button>
              </>
            ) : (
              <>
                <button type="submit" name="intent" value="draft" className="admin-btn admin-btn--outline">Save draft</button>
                <button type="submit" name="intent" value="publish" className="admin-btn admin-btn--primary">Publish event</button>
              </>
            )}
          </div>
        </div>
      </form>

      {modal ? (
        <InlineModal
          kind={modal}
          onClose={() => setModal(null)}
          onCreateType={createType}
          onCreateHost={createHost}
          onCreateVenue={createVenue}
          pending={pending}
          error={modalError}
        />
      ) : null}
    </>
  );
}
