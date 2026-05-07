"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import type { ReactNode } from "react";
import { formatInTimeZone } from "date-fns-tz";
import {
  createInlineEventHost,
  createInlineEventType,
  createInlineEventVenue,
  archiveEvent,
  detachEventZoomSession,
  saveEvent,
} from "./actions";
import { EVENT_ACCESS_LEVELS, accessLevelLabel } from "@/lib/events/types";
import type {
  EventHostOption,
  EventTypeOption,
  EventVenueOption,
  ZoomConnectionOption,
  EventAccessLevel,
} from "@/lib/events/types";
import type { EventAdminDefaults, EventRow } from "@/lib/queries/get-events";
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

function subscribeHydrationReady() {
  return () => {};
}

function clientHydrationSnapshot() {
  return true;
}

function serverHydrationSnapshot() {
  return false;
}

type SearchParams = { error?: string; success?: string; zoomConnectionId?: string; starts_at?: string };
type ModalKind = "type" | "host" | "venue" | null;
type HostAssignmentDraft = {
  hostId: string;
  role: "host" | "organizer" | "speaker" | "instructor" | "partner";
  isPrimary: boolean;
};
type TicketDraft = {
  id?: string;
  name: string;
  description: string;
  priceDollars: string;
  currency: string;
  capacity: string;
  maxPerOrder: string;
  status: "active" | "disabled";
  accessLevels: string[];
};
type RsvpDraft = {
  id?: string;
  name: string;
  description: string;
  capacity: string;
  startAt: string;
  endAt: string;
  collectAttendeeInfo: boolean;
  status: "active" | "disabled";
};

function normalizeLocalDateTime(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function datetimeLocal(value?: string | null, timezone = "America/New_York") {
  if (!value) return "";
  return formatInTimeZone(new Date(value), timezone, "yyyy-MM-dd'T'HH:mm");
}

function addOneHourLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(date.getHours() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
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
  if (error === "manual_join_url_required") return "Add a manual join URL before publishing.";
  if (error === "zoom_connection_required") return "Choose a Zoom account before creating the Zoom session.";
  if (error === "zoom_session_required") return "Choose an existing Zoom session before saving.";
  if (error === "zoom_setup_required") return "Choose how Zoom should be set up before publishing.";
  if (error === "zoom_create_failed") return "Zoom could not create the session. The event was kept as a draft.";
  if (error === "zoom_detach_failed") return "Zoom could not be removed from this event. Try again.";
  if (error === "ticket_required") return "Add at least one active ticket type before publishing a ticketed event.";
  return error ? "The event could not be saved. Check required fields and integration settings." : null;
}

function virtualStateLabel(virtualMode: string, event?: EventRow | null) {
  if (virtualMode === "manual") return event?.manual_join_url ? "Manual link set" : "Manual link needed";
  if (virtualMode === "zoom") {
    return event?.event_zoom_meeting?.id ? "Zoom session attached" : "Zoom setup needed";
  }
  return "No virtual link";
}

function zoomAccountLabel(event?: EventRow | null) {
  const zoom = event?.event_zoom_meeting;
  if (!zoom) return "No Zoom session";
  return zoom.zoom_connection?.label || zoom.zoom_connection?.zoom_user_email || zoom.host_email || "Zoom account";
}

function dollarsFromCents(value?: number | null) {
  if (!value) return "";
  return (value / 100).toFixed(2);
}

function ticketDraftFromEvent(event?: EventRow | null): TicketDraft[] {
  return (event?.event_ticket_type ?? [])
    .filter((ticket) => ticket.status !== "archived")
    .map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      description: ticket.description ?? "",
      priceDollars: dollarsFromCents(ticket.price_cents),
      currency: ticket.currency ?? "usd",
      capacity: ticket.capacity === null || ticket.capacity === undefined ? "" : String(ticket.capacity),
      maxPerOrder: String(ticket.max_per_order ?? 4),
      status: ticket.status === "disabled" ? "disabled" : "active",
      accessLevels: (ticket.event_ticket_type_access_level ?? []).map((row) => row.subscription_tier),
    }));
}

function hostAssignmentsFromEvent(event?: EventRow | null): HostAssignmentDraft[] {
  const assignments = event?.event_host_assignment ?? [];
  if (assignments.length > 0) {
    return assignments.map((assignment) => ({
      hostId: assignment.host_id,
      role: assignment.role,
      isPrimary: assignment.is_primary,
    }));
  }
  return event?.host_id ? [{ hostId: event.host_id, role: "host", isPrimary: true }] : [];
}

function hostRoleLabel(role: HostAssignmentDraft["role"]) {
  if (role === "organizer") return "Organizer";
  if (role === "speaker") return "Speaker";
  if (role === "instructor") return "Instructor";
  if (role === "partner") return "Partner";
  return "Host";
}

function newTicketDraft(accessLevels: string[]): TicketDraft {
  return {
    name: "General Admission",
    description: "",
    priceDollars: "",
    currency: "usd",
    capacity: "",
    maxPerOrder: "4",
    status: "active",
    accessLevels,
  };
}

function rsvpDraftFromEvent(event?: EventRow | null, timezone = "America/New_York"): RsvpDraft[] {
  return (event?.event_rsvp_type ?? [])
    .filter((rsvp) => rsvp.status !== "archived")
    .map((rsvp) => ({
      id: rsvp.id,
      name: rsvp.name,
      description: rsvp.description ?? "",
      capacity: rsvp.capacity === null || rsvp.capacity === undefined ? "" : String(rsvp.capacity),
      startAt: rsvp.start_at ? datetimeLocal(rsvp.start_at, timezone) : "",
      endAt: rsvp.end_at ? datetimeLocal(rsvp.end_at, timezone) : "",
      collectAttendeeInfo: Boolean(rsvp.collect_attendee_info),
      status: rsvp.status === "disabled" ? "disabled" : "active",
    }));
}

function newRsvpDraft(endAt: string): RsvpDraft {
  return {
    name: "RSVP",
    description: "",
    capacity: "",
    startAt: "",
    endAt,
    collectAttendeeInfo: false,
    status: "active",
  };
}

function defaultAccessValues(defaults?: EventAdminDefaults) {
  return defaults?.accessLevels?.length ? defaults.accessLevels : (["level_2"] as EventAccessLevel[]);
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
  defaults,
  searchParams,
}: {
  event?: EventRow | null;
  types: EventTypeOption[];
  hosts: EventHostOption[];
  venues: EventVenueOption[];
  zoomConnections: ZoomConnectionOption[];
  defaults?: EventAdminDefaults;
  searchParams?: SearchParams;
}) {
  const [types, setTypes] = useState(initialTypes);
  const [hosts, setHosts] = useState(initialHosts);
  const [venues, setVenues] = useState(initialVenues);
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const hydrated = useSyncExternalStore(
    subscribeHydrationReady,
    clientHydrationSnapshot,
    serverHydrationSnapshot
  );
  const [pending, startTransition] = useTransition();

  const initialTimezone = event?.timezone ?? defaults?.timezone ?? "America/New_York";
  const [title, setTitle] = useState(event?.title ?? "");
  const [typeId, setTypeId] = useState(event?.type_id ?? initialTypes[0]?.id ?? "");
  const [hostAssignments, setHostAssignments] = useState<HostAssignmentDraft[]>(() => hostAssignmentsFromEvent(event));
  const [hostSearch, setHostSearch] = useState("");
  const [newHostId, setNewHostId] = useState("");
  const [venueId, setVenueId] = useState(event?.venue_id ?? "");
  const [venueSearch, setVenueSearch] = useState("");
  const [timezone, setTimezone] = useState(initialTimezone);
  const initialStartsAt = event
    ? datetimeLocal(event.starts_at, initialTimezone)
    : normalizeLocalDateTime(searchParams?.starts_at);
  const [startsAt, setStartsAt] = useState(initialStartsAt);
  const [endsAt, setEndsAt] = useState(
    event ? datetimeLocal(event.ends_at, initialTimezone) : addOneHourLocal(initialStartsAt)
  );
  const [virtualMode, setVirtualMode] = useState(event?.virtual_mode ?? "none");
  const hasAttachedZoom = Boolean(event?.event_zoom_meeting?.id);
  const [zoomMode, setZoomMode] = useState(hasAttachedZoom ? "none" : "");
  const [ticketingMode, setTicketingMode] = useState(event?.ticketing_mode ?? "included");
  const [recurrence, setRecurrence] = useState("none");
  const [accessLevels, setAccessLevels] = useState<string[]>(
    EVENT_ACCESS_LEVELS
      .filter((level) => (event ? hasAccess(event, level.value) : defaultAccessValues(defaults).includes(level.value)))
      .map((level) => level.value)
  );
  const [ticketTypes, setTicketTypes] = useState<TicketDraft[]>(() => ticketDraftFromEvent(event));
  const initialRsvpDrafts = rsvpDraftFromEvent(event, initialTimezone);
  const [rsvpEnabled, setRsvpEnabled] = useState(initialRsvpDrafts.some((rsvp) => rsvp.status === "active"));
  const [rsvpTypes, setRsvpTypes] = useState<RsvpDraft[]>(() => initialRsvpDrafts);

  const selectedZoomConnection =
    searchParams?.zoomConnectionId ?? event?.event_zoom_meeting?.zoom_connection_id ?? "";
  const connectReturn = event?.id ? `/admin/events/${event.id}/edit` : "/admin/events/new";
  const currentStatus = event?.status ?? "draft";
  const published = currentStatus === "published";
  const message = successMessage(searchParams?.success);
  const displayMessage =
    searchParams?.success === "zoom_detached"
      ? "Zoom session removed from this event. The meeting or webinar was not deleted in Zoom."
      : message;
  const error = errorMessage(searchParams?.error);

  const selectedAccessText = useMemo(
    () => accessLevels.map(accessLevelLabel).join(", ") || "No levels selected",
    [accessLevels]
  );
  const ticketConfig = useMemo(
    () => JSON.stringify({ mode: ticketingMode, ticketTypes }),
    [ticketingMode, ticketTypes]
  );
  const rsvpConfig = useMemo(
    () => JSON.stringify({ enabled: rsvpEnabled, rsvpTypes }),
    [rsvpEnabled, rsvpTypes]
  );
  const hostAssignmentConfig = useMemo(() => JSON.stringify(hostAssignments), [hostAssignments]);
  const filteredHosts = useMemo(() => {
    const query = hostSearch.trim().toLowerCase();
    if (!query) return hosts;
    return hosts.filter((host) =>
      [host.name, host.email, host.type].filter(Boolean).join(" ").toLowerCase().includes(query)
    );
  }, [hostSearch, hosts]);
  const filteredVenues = useMemo(() => {
    const query = venueSearch.trim().toLowerCase();
    if (!query) return venues;
    return venues.filter((venue) =>
      [venue.name, venue.city, venue.region, venue.country].filter(Boolean).join(" ").toLowerCase().includes(query)
    );
  }, [venueSearch, venues]);
  const selectedVenue = useMemo(() => venues.find((venue) => venue.id === venueId) ?? null, [venues, venueId]);

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
      setHostAssignments((current) => [
        ...current,
        { hostId: result.item.id, role: "host", isPrimary: current.length === 0 },
      ]);
      setModal(null);
    });
  }

  function addHostAssignment(hostId: string) {
    if (!hostId || hostId === "__create") return;
    setHostAssignments((current) => {
      if (current.some((assignment) => assignment.hostId === hostId)) return current;
      return [...current, { hostId, role: "host", isPrimary: current.length === 0 }];
    });
    setNewHostId("");
  }

  function updateHostAssignment(index: number, patch: Partial<HostAssignmentDraft>) {
    setHostAssignments((current) =>
      current.map((assignment, assignmentIndex) => {
        if (assignmentIndex !== index) {
          return patch.isPrimary ? { ...assignment, isPrimary: false } : assignment;
        }
        return { ...assignment, ...patch };
      })
    );
  }

  function removeHostAssignment(index: number) {
    setHostAssignments((current) => {
      const next = current.filter((_, assignmentIndex) => assignmentIndex !== index);
      if (next.length > 0 && !next.some((assignment) => assignment.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
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

  function updateTicket(index: number, patch: Partial<TicketDraft>) {
    setTicketTypes((current) =>
      current.map((ticket, ticketIndex) => ticketIndex === index ? { ...ticket, ...patch } : ticket)
    );
  }

  function updateRsvp(index: number, patch: Partial<RsvpDraft>) {
    setRsvpTypes((current) =>
      current.map((rsvp, rsvpIndex) => rsvpIndex === index ? { ...rsvp, ...patch } : rsvp)
    );
  }

  function toggleTicketAccess(index: number, value: string) {
    setTicketTypes((current) =>
      current.map((ticket, ticketIndex) => {
        if (ticketIndex !== index) return ticket;
        const nextAccess = ticket.accessLevels.includes(value)
          ? ticket.accessLevels.filter((entry) => entry !== value)
          : [...ticket.accessLevels, value];
        return { ...ticket, accessLevels: nextAccess };
      })
    );
  }

  return (
    <>
      <form action={saveEvent} className="admin-form-card pb-28" data-event-form-ready={hydrated ? "true" : "false"}>
        {event?.id ? <input type="hidden" name="id" value={event.id} /> : null}
        <input type="hidden" name="current_status" value={currentStatus} />
        <input type="hidden" name="ticket_config" value={ticketConfig} />
        <input type="hidden" name="rsvp_config" value={rsvpConfig} />
        <input type="hidden" name="host_assignments" value={hostAssignmentConfig} />

        {error ? <div className="admin-banner admin-banner--error">{error}</div> : null}
        {displayMessage ? <div className="admin-banner admin-banner--success">{displayMessage}</div> : null}

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
              <span>{virtualStateLabel(virtualMode, event)}</span>
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
          <div className="grid gap-5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                    Hosts
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add one or more organizers, speakers, instructors, or partners.
                  </p>
                </div>
                <button type="button" className="admin-btn admin-btn--outline" onClick={() => openModal("host")}>
                  Create new host
                </button>
              </div>

              <div className="admin-form-grid-2">
                <div className="admin-form-field">
                  <label htmlFor="host_search" className="admin-label">Search hosts</label>
                  <input
                    id="host_search"
                    value={hostSearch}
                    onChange={(event) => setHostSearch(event.target.value)}
                    className="admin-input"
                    placeholder="Name, email, or type"
                  />
                </div>
                <div className="admin-form-field">
                  <label htmlFor="host_select" className="admin-label">Add host</label>
                  <div className="flex gap-2">
                    <select
                      id="host_select"
                      value={newHostId}
                      onChange={(event) => setNewHostId(event.target.value)}
                      className="admin-select"
                    >
                      <option value="">Choose host</option>
                      {filteredHosts.map((host) => (
                        <option key={host.id} value={host.id}>
                          {host.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => addHostAssignment(newHostId)}>
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {hostAssignments.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {hostAssignments.map((assignment, index) => {
                    const host = hosts.find((host) => host.id === assignment.hostId);
                    return (
                      <div key={assignment.hostId} className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 md:grid-cols-[1fr_12rem_8rem_auto] md:items-center">
                        <div>
                          <p className="font-semibold text-foreground">{host?.name ?? "Unknown host"}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignment.isPrimary ? "Primary host" : "Additional host"} · {hostRoleLabel(assignment.role)}
                          </p>
                        </div>
                        <label className="admin-form-field">
                          <span className="admin-label">Role</span>
                          <select
                            value={assignment.role}
                            onChange={(event) => updateHostAssignment(index, { role: event.target.value as HostAssignmentDraft["role"] })}
                            className="admin-select"
                          >
                            <option value="host">Host</option>
                            <option value="organizer">Organizer</option>
                            <option value="speaker">Speaker</option>
                            <option value="instructor">Instructor</option>
                            <option value="partner">Partner</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <input
                            type="radio"
                            name="primary_host_choice"
                            checked={assignment.isPrimary}
                            onChange={() => updateHostAssignment(index, { isPrimary: true })}
                            className="h-4 w-4"
                          />
                          Primary
                        </label>
                        <button type="button" className="admin-btn admin-btn--outline" onClick={() => removeHostAssignment(index)}>
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No hosts selected. Add a host when the event should show an organizer profile.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                    Venue
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose one primary location and add event-specific room notes when needed.
                  </p>
                </div>
                <button type="button" className="admin-btn admin-btn--outline" onClick={() => openModal("venue")}>
                  Create new venue
                </button>
              </div>

              <div className="admin-form-grid-2">
                <div className="admin-form-field">
                  <label htmlFor="venue_search" className="admin-label">Search venues</label>
                  <input
                    id="venue_search"
                    value={venueSearch}
                    onChange={(event) => setVenueSearch(event.target.value)}
                    className="admin-input"
                    placeholder="Venue, city, or state"
                  />
                </div>
                <div className="admin-form-field">
                  <label htmlFor="venue_id" className="admin-label">Venue</label>
                  <select
                    id="venue_id"
                    name="venue_id"
                    value={venueId}
                    onChange={(event) => setVenueId(event.target.value)}
                    className="admin-select"
                  >
                    <option value="">No venue</option>
                    {filteredVenues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
                  </select>
                </div>
              </div>

              {selectedVenue ? (
                <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3 text-sm">
                  <p className="font-semibold text-foreground">{selectedVenue.name}</p>
                  <p className="mt-1 text-muted-foreground">
                    {[selectedVenue.address_line1, selectedVenue.city, selectedVenue.region, selectedVenue.country].filter(Boolean).join(", ") || (selectedVenue.is_virtual ? "Virtual venue" : "No address saved")}
                  </p>
                  {selectedVenue.website_url || selectedVenue.map_url ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selectedVenue.website_url ? "Website saved" : null}
                      {selectedVenue.website_url && selectedVenue.map_url ? " · " : null}
                      {selectedVenue.map_url ? "Map link saved" : null}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="admin-form-grid-2 mt-4">
                <div className="admin-form-field">
                  <label htmlFor="venue_room_name" className="admin-label">Room or location note</label>
                  <input
                    id="venue_room_name"
                    name="venue_room_name"
                    defaultValue={event?.venue_room_name ?? ""}
                    className="admin-input"
                    placeholder="Studio B, upstairs classroom, Zoom room"
                  />
                </div>
                <div className="admin-form-field">
                  <label htmlFor="venue_notes" className="admin-label">Event-specific venue notes</label>
                  <input
                    id="venue_notes"
                    name="venue_notes"
                    defaultValue={event?.venue_notes ?? ""}
                    className="admin-input"
                    placeholder="Use side entrance, arrive 10 minutes early"
                  />
                </div>
              </div>
            </div>
          </div>
          <Link href="/admin/events/hosts" className="text-xs font-semibold text-primary">
            Manage host and venue libraries
          </Link>
        </FieldSection>

        <FieldSection title="Virtual / Zoom">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Virtual access</p>
                <p className="mt-1 font-semibold text-foreground">{virtualStateLabel(virtualMode, event)}</p>
              </div>
              {virtualMode === "zoom" && hasAttachedZoom ? (
                <span className="admin-badge admin-badge--published">Attached</span>
              ) : virtualMode === "zoom" ? (
                <span className="admin-badge admin-badge--review">Setup needed</span>
              ) : (
                <span className="admin-badge admin-badge--draft">No Zoom</span>
              )}
            </div>
          </div>

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

          {hasAttachedZoom && virtualMode !== "zoom" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
              This event still has a Zoom session attached. Members will not see that Zoom link after you save unless Virtual mode is set back to Zoom.
            </div>
          ) : null}

          {virtualMode === "zoom" && hasAttachedZoom ? (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Current Zoom session</p>
                  <h3 className="mt-1 font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                    {event?.event_zoom_meeting?.zoom_object_type === "webinar" ? "Zoom webinar" : "Zoom meeting"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {zoomAccountLabel(event)}
                    {event?.event_zoom_meeting?.zoom_connection?.zoom_user_email ? ` (${event.event_zoom_meeting.zoom_connection.zoom_user_email})` : ""}
                  </p>
                </div>
                <button
                  type="submit"
                  formAction={detachEventZoomSession}
                  formNoValidate
                  className="admin-btn admin-btn--outline"
                >
                  Remove Zoom session from this event
                </button>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Zoom ID</dt>
                  <dd className="mt-1 text-foreground">{event?.event_zoom_meeting?.zoom_object_id ?? "Not stored"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Status</dt>
                  <dd className="mt-1 text-foreground">{event?.event_zoom_meeting?.provider_status ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Join URL</dt>
                  <dd className="mt-1 text-foreground">{event?.event_zoom_meeting?.join_url ? "Available to eligible members" : "Missing"}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Saving event details will keep this Zoom session attached. Remove it first if you want to choose or create a different Zoom session.
              </p>
            </div>
          ) : null}

          {virtualMode === "zoom" && !hasAttachedZoom ? (
            <div className="grid gap-4">
              <div className="admin-form-field">
                <label htmlFor="zoom_mode" className="admin-label">Zoom session</label>
                <select id="zoom_mode" name="zoom_mode" value={zoomMode} onChange={(event) => setZoomMode(event.target.value)} className="admin-select">
                  <option value="">Choose Zoom session setup</option>
                  <option value="create">Create new Zoom session</option>
                  <option value="existing">Choose existing Zoom session</option>
                </select>
                {zoomMode === "create" ? (
                  <p className="admin-hint">Zoom will be created when this event is saved or published. Recurring events use one shared Zoom series.</p>
                ) : null}
              </div>
              {zoomMode === "" ? (
                <p className="admin-hint">Choose whether to create a new Zoom session or attach one that already exists.</p>
              ) : zoomConnections.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="font-semibold text-foreground">No Zoom accounts connected</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Connect a Zoom account before creating or choosing a Zoom session.
                  </p>
                  <a
                    href={`/api/admin/integrations/zoom/connect?returnTo=${encodeURIComponent(connectReturn)}`}
                    className="admin-btn admin-btn--primary mt-3"
                  >
                    Connect Zoom account
                  </a>
                </div>
              ) : (
                <ZoomMeetingPicker
                  key={zoomMode}
                  connections={zoomConnections}
                  connectReturn={connectReturn}
                  defaultConnectionId={selectedZoomConnection}
                  defaultObjectType={event?.event_zoom_meeting?.zoom_object_type ?? "meeting"}
                  mode={zoomMode === "existing" ? "existing" : "create"}
                />
              )}
            </div>
          ) : null}
        </FieldSection>

        <FieldSection title="Ticketing">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Access after publication</p>
                <h3 className="mt-1 font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                  {ticketingMode === "ticket_required" ? "Ticket required" : "Included with membership"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ticketed events still use the selected membership levels. A ticket is required only for the join link and replay.
                </p>
              </div>
              <select
                value={ticketingMode}
                onChange={(event) => {
                  const nextMode = event.target.value as "included" | "ticket_required";
                  setTicketingMode(nextMode);
                  if (nextMode === "ticket_required" && ticketTypes.length === 0) {
                    setTicketTypes([{ ...newTicketDraft(accessLevels), maxPerOrder: String(defaults?.defaultMaxPerOrder ?? 4) }]);
                  }
                }}
                className="admin-select min-w-56"
                aria-label="Ticketing mode"
              >
                <option value="included">Included with membership</option>
                <option value="ticket_required">Ticket required</option>
              </select>
            </div>
          </div>

          {ticketingMode === "ticket_required" ? (
            <div className="grid gap-4">
              {ticketTypes.map((ticket, index) => (
                <div key={ticket.id ?? index} className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Ticket type</p>
                      <h3 className="mt-1 font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                        {ticket.name || "Untitled ticket"}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline"
                        onClick={() => updateTicket(index, { status: ticket.status === "active" ? "disabled" : "active" })}
                      >
                        {ticket.status === "active" ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline"
                        onClick={() => setTicketTypes((current) => current.filter((_, ticketIndex) => ticketIndex !== index))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="admin-form-grid-2">
                    <div className="admin-form-field">
                      <label className="admin-label" htmlFor={`ticket_name_${index}`}>Name</label>
                      <input
                        id={`ticket_name_${index}`}
                        value={ticket.name}
                        onChange={(event) => updateTicket(index, { name: event.target.value })}
                        className="admin-input"
                        placeholder="Member ticket"
                      />
                    </div>
                    <div className="admin-form-field">
                      <label className="admin-label" htmlFor={`ticket_price_${index}`}>Price</label>
                      <input
                        id={`ticket_price_${index}`}
                        value={ticket.priceDollars}
                        onChange={(event) => updateTicket(index, { priceDollars: event.target.value })}
                        className="admin-input"
                        inputMode="decimal"
                        placeholder="49.00"
                      />
                    </div>
                    <div className="admin-form-field">
                      <label className="admin-label" htmlFor={`ticket_capacity_${index}`}>Capacity</label>
                      <input
                        id={`ticket_capacity_${index}`}
                        value={ticket.capacity}
                        onChange={(event) => updateTicket(index, { capacity: event.target.value })}
                        className="admin-input"
                        inputMode="numeric"
                        placeholder="Leave blank for unlimited"
                      />
                    </div>
                    <div className="admin-form-field">
                      <label className="admin-label" htmlFor={`ticket_max_${index}`}>Max per order</label>
                      <input
                        id={`ticket_max_${index}`}
                        value={ticket.maxPerOrder}
                        onChange={(event) => updateTicket(index, { maxPerOrder: event.target.value })}
                        className="admin-input"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="admin-form-field mt-4">
                    <label className="admin-label" htmlFor={`ticket_description_${index}`}>Description</label>
                    <textarea
                      id={`ticket_description_${index}`}
                      value={ticket.description}
                      onChange={(event) => updateTicket(index, { description: event.target.value })}
                      className="admin-textarea"
                      rows={2}
                      placeholder="Optional helper text for members."
                    />
                  </div>

                  <div className="admin-form-field mt-4">
                    <span className="admin-label">Who can buy this ticket</span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {EVENT_ACCESS_LEVELS.map((level) => (
                        <label key={level.value} className="rounded-xl border border-border px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={ticket.accessLevels.includes(level.value)}
                            onChange={() => toggleTicketAccess(index, level.value)}
                            className="mr-2 h-4 w-4"
                          />
                          {level.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="admin-btn admin-btn--outline justify-self-start"
                onClick={() => setTicketTypes((current) => [
                  ...current,
                  { ...newTicketDraft(accessLevels), maxPerOrder: String(defaults?.defaultMaxPerOrder ?? 4) },
                ])}
              >
                Add ticket type
              </button>
            </div>
          ) : null}
        </FieldSection>

        <FieldSection title="RSVP">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Free registration</p>
                <h3 className="mt-1 font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                  {rsvpEnabled ? "RSVP enabled" : "No RSVP required"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  RSVP creates attendee records for check-in and event operations. It does not charge members.
                </p>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={rsvpEnabled}
                  onChange={(event) => {
                    setRsvpEnabled(event.target.checked);
                    if (event.target.checked && rsvpTypes.length === 0) {
                      setRsvpTypes([newRsvpDraft(startsAt)]);
                    }
                  }}
                  className="h-4 w-4"
                />
                Enable RSVP
              </label>
            </div>
          </div>

          {rsvpEnabled ? (
            <div className="grid gap-4">
              {(rsvpTypes.length > 0 ? rsvpTypes : [newRsvpDraft(startsAt)]).map((rsvp, index) => (
                <div key={rsvp.id ?? index} className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">RSVP type</p>
                      <h3 className="mt-1 font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                        {rsvp.name || "RSVP"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn--outline"
                      onClick={() => updateRsvp(index, { status: rsvp.status === "active" ? "disabled" : "active" })}
                    >
                      {rsvp.status === "active" ? "Disable" : "Enable"}
                    </button>
                  </div>

                  <div className="admin-form-grid-2">
                    <div className="admin-form-field">
                      <label htmlFor={`rsvp_name_${index}`} className="admin-label">Name</label>
                      <input
                        id={`rsvp_name_${index}`}
                        value={rsvp.name}
                        onChange={(event) => updateRsvp(index, { name: event.target.value })}
                        className="admin-input"
                        placeholder="RSVP"
                      />
                    </div>
                    <div className="admin-form-field">
                      <label htmlFor={`rsvp_capacity_${index}`} className="admin-label">Capacity</label>
                      <input
                        id={`rsvp_capacity_${index}`}
                        value={rsvp.capacity}
                        onChange={(event) => updateRsvp(index, { capacity: event.target.value })}
                        className="admin-input"
                        inputMode="numeric"
                        placeholder="Leave blank for unlimited"
                      />
                    </div>
                    <div className="admin-form-field">
                      <label htmlFor={`rsvp_start_${index}`} className="admin-label">Opens</label>
                      <input
                        id={`rsvp_start_${index}`}
                        value={rsvp.startAt}
                        onChange={(event) => updateRsvp(index, { startAt: event.target.value })}
                        className="admin-input"
                        type="datetime-local"
                      />
                    </div>
                    <div className="admin-form-field">
                      <label htmlFor={`rsvp_end_${index}`} className="admin-label">Closes</label>
                      <input
                        id={`rsvp_end_${index}`}
                        value={rsvp.endAt}
                        onChange={(event) => updateRsvp(index, { endAt: event.target.value })}
                        className="admin-input"
                        type="datetime-local"
                      />
                      <p className="admin-hint">Default is the event start time.</p>
                    </div>
                  </div>

                  <div className="admin-form-field mt-4">
                    <label htmlFor={`rsvp_description_${index}`} className="admin-label">Description</label>
                    <textarea
                      id={`rsvp_description_${index}`}
                      value={rsvp.description}
                      onChange={(event) => updateRsvp(index, { description: event.target.value })}
                      className="admin-textarea"
                      rows={2}
                      placeholder="Optional helper text for members."
                    />
                  </div>

                  <label className="mt-4 flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={rsvp.collectAttendeeInfo}
                      onChange={(event) => updateRsvp(index, { collectAttendeeInfo: event.target.checked })}
                      className="h-4 w-4"
                    />
                    Require attendee name and email
                  </label>
                </div>
              ))}
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
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {published
                ? "Published events are visible to the selected membership levels."
                : "Drafts stay visible in admin only until you publish them."}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {event?.id ? (
                <button type="submit" formAction={archiveEvent} formNoValidate className="admin-btn admin-btn--outline">
                  Archive
                </button>
              ) : null}
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
