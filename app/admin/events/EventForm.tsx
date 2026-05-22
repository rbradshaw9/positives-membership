"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
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
import {
  EVENT_ACCESS_LEVELS,
  EVENT_REGISTRATION_FIELD_TYPES,
  accessLevelLabel,
  normalizeRegistrationFields,
} from "@/lib/events/types";
import type {
  EventHostOption,
  EventRegistrationField,
  EventRegistrationPlacement,
  EventRegistrationFieldType,
  EventTypeOption,
  EventVenueOption,
  ZoomConnectionOption,
  EventAccessLevel,
} from "@/lib/events/types";
import type { EventAdminDefaults, EventRow } from "@/lib/queries/get-events";
import { ZoomMeetingPicker } from "@/components/admin/events/ZoomMeetingPicker";
import { EventDetailsEditor } from "@/components/admin/events/EventDetailsEditor";
import { SafeImage } from "@/components/media/SafeImage";

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
  saleStartsAt: string;
  saleEndsAt: string;
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
  registrationFields: EventRegistrationField[];
  status: "active" | "disabled";
};
type EventImageAsset = {
  id: string;
  title: string | null;
  altText: string | null;
  originalFilename: string | null;
  contentType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
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

function formatLocalDraftDate(value: string) {
  if (!value) return "No start time selected";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
  if (error === "livekit_setup_required") return "LiveKit RoomService and Egress must be healthy before publishing an auto-recorded LiveKit event.";
  if (error === "ticket_required") return "Add at least one active ticket type before publishing a ticketed event.";
  return error ? "The event could not be saved. Check required fields and integration settings." : null;
}

function virtualStateLabel(virtualMode: string, event?: EventRow | null) {
  if (virtualMode === "manual") return event?.manual_join_url ? "Manual link set" : "Manual link needed";
  if (virtualMode === "zoom") {
    return event?.event_zoom_meeting?.id ? "Zoom session attached" : "Zoom setup needed";
  }
  if (virtualMode === "livekit") {
    return event?.event_livekit_room?.id ? "LiveKit webinar ready" : "LiveKit webinar setup needed";
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

function ticketDraftFromEvent(event?: EventRow | null, timezone = "America/New_York"): TicketDraft[] {
  return (event?.event_ticket_type ?? [])
    .filter((ticket) => ticket.status !== "archived")
    .map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      description: ticket.description ?? "",
      priceDollars: dollarsFromCents(ticket.price_cents),
      currency: ticket.currency ?? "usd",
      capacity: ticket.capacity === null || ticket.capacity === undefined ? "" : String(ticket.capacity),
      saleStartsAt: ticket.sale_starts_at ? datetimeLocal(ticket.sale_starts_at, timezone) : "",
      saleEndsAt: ticket.sale_ends_at ? datetimeLocal(ticket.sale_ends_at, timezone) : "",
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
    saleStartsAt: "",
    saleEndsAt: "",
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
      registrationFields: normalizeRegistrationFields(rsvp.registration_fields),
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
    registrationFields: [],
    status: "active",
  };
}

function draftId(prefix = "field") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function newRegistrationField(): EventRegistrationField {
  return {
    id: draftId("field"),
    label: "",
    type: "short_text",
    required: false,
  };
}

function newRegistrationOption(fieldId: string, index: number) {
  return {
    id: `${fieldId}_option_${index + 1}`,
    label: "",
    value: "",
  };
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EventImagePicker({ defaultValue = "" }: { defaultValue?: string | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);
  const [selectedUrl, setSelectedUrl] = useState(defaultValue ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [assets, setAssets] = useState<EventImageAsset[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLibrary() {
    setLibraryLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/media/event-images", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Image library could not be loaded.");
      setAssets(Array.isArray(payload.assets) ? payload.assets : []);
      setLibraryLoaded(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Image library could not be loaded.");
    } finally {
      setLibraryLoading(false);
    }
  }

  function openModal(nextTab: "library" | "upload") {
    setTab(nextTab);
    setModalOpen(true);
    if (!libraryLoaded && !libraryLoading) void loadLibrary();
  }

  function selectAsset(asset: EventImageAsset) {
    setSelectedUrl(asset.url);
    setModalOpen(false);
  }

  async function uploadImage() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an image to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("title", titleInputRef.current?.value ?? "");
    form.set("alt_text", altInputRef.current?.value ?? "");

    try {
      const response = await fetch("/api/admin/media/event-images", {
        method: "POST",
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Image could not be uploaded.");
      const asset = payload.asset as EventImageAsset;
      setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setLibraryLoaded(true);
      setSelectedUrl(asset.url);
      setModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (titleInputRef.current) titleInputRef.current.value = "";
      if (altInputRef.current) altInputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid max-w-3xl gap-3">
      <input type="hidden" name="image_url" value={selectedUrl} readOnly />
      <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
        {selectedUrl ? (
          <div className="relative aspect-video bg-muted">
            <SafeImage
              src={selectedUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="grid aspect-video place-items-center bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(232,246,243,0.88))] p-5 text-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Event image</p>
              <p className="mt-2 text-sm text-muted-foreground">Upload or choose a hero image for the member-facing event page.</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className="admin-btn admin-btn--primary justify-center" onClick={() => openModal("upload")}>
          Upload image
        </button>
        <button type="button" className="admin-btn admin-btn--outline justify-center" onClick={() => openModal("library")}>
          Choose from library
        </button>
        {selectedUrl ? (
          <button type="button" className="admin-btn admin-btn--outline justify-center" onClick={() => setSelectedUrl("")}>
            Remove image
          </button>
        ) : null}
      </div>
      <p className="admin-hint">Images upload to S3 and are saved as the member-facing event hero image.</p>

      {modalOpen ? (
        <div className="event-image-modal" role="dialog" aria-modal="true" aria-labelledby="event-hero-image-title">
          <div className="event-image-modal__panel">
            <div className="event-image-modal__header">
              <div>
                <h2 id="event-hero-image-title" className="event-image-modal__title">
                  Event image
                </h2>
                <p className="event-image-modal__subtitle">
                  Upload a new S3 image or choose one from the event image library.
                </p>
              </div>
              <button type="button" className="admin-btn admin-btn--outline" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            <div className="event-image-modal__tabs" role="tablist" aria-label="Image options">
              <button type="button" className={tab === "library" ? "is-active" : ""} onClick={() => setTab("library")}>
                Library
              </button>
              <button type="button" className={tab === "upload" ? "is-active" : ""} onClick={() => setTab("upload")}>
                Upload
              </button>
            </div>

            {error ? <div className="admin-banner admin-banner--error">{error}</div> : null}

            {tab === "library" ? (
              <div className="event-image-modal__body">
                <div className="event-image-modal__toolbar">
                  <p className="event-image-modal__subtitle">
                    {libraryLoading ? "Loading images..." : `${assets.length} image${assets.length === 1 ? "" : "s"} available`}
                  </p>
                  <button type="button" className="admin-btn admin-btn--outline" onClick={() => void loadLibrary()} disabled={libraryLoading}>
                    Refresh
                  </button>
                </div>
                {assets.length > 0 ? (
                  <div className="event-image-grid">
                    {assets.map((asset) => (
                      <button key={asset.id} type="button" className="event-image-card" onClick={() => selectAsset(asset)}>
                        <span className="event-image-card__thumb">
                          <SafeImage
                            src={asset.url}
                            alt=""
                            width={320}
                            height={240}
                            sizes="10rem"
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <span className="event-image-card__title">{asset.title ?? asset.originalFilename ?? "Event image"}</span>
                        <span className="event-image-card__meta">{formatFileSize(asset.sizeBytes)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="event-image-modal__empty">
                    {libraryLoading ? "Loading images..." : "No event images are in the library yet."}
                  </div>
                )}
              </div>
            ) : (
              <div className="event-image-modal__body">
                <label className="admin-form-field">
                  <span className="admin-label">Image file</span>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="admin-input" />
                </label>
                <label className="admin-form-field">
                  <span className="admin-label">Title</span>
                  <input ref={titleInputRef} className="admin-input" placeholder="Optional display title" />
                </label>
                <label className="admin-form-field">
                  <span className="admin-label">Alt text</span>
                  <input ref={altInputRef} className="admin-input" placeholder="Optional accessibility description" />
                </label>
                <div className="event-image-modal__actions">
                  <button type="button" className="admin-btn admin-btn--outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="admin-btn admin-btn--primary" onClick={() => void uploadImage()} disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload and use image"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function duplicateTicketDraft(ticket: TicketDraft): TicketDraft {
  return {
    ...ticket,
    id: undefined,
    name: ticket.name ? `Copy of ${ticket.name}` : "General Admission",
    status: "active",
  };
}

function duplicateRsvpDraft(rsvp: RsvpDraft): RsvpDraft {
  return {
    ...rsvp,
    id: undefined,
    name: rsvp.name ? `Copy of ${rsvp.name}` : "RSVP",
    registrationFields: rsvp.registrationFields.map((field) => {
      const fieldId = draftId("field");
      return {
        ...field,
        id: fieldId,
        options: field.options?.map((option, index) => ({
          ...option,
          id: `${fieldId}_option_${index + 1}`,
        })),
      };
    }),
    status: "active",
  };
}

function ticketSummaryParts(ticket: TicketDraft) {
  const price = ticket.priceDollars ? `$${ticket.priceDollars}` : "No price set";
  const capacity = ticket.capacity ? `${ticket.capacity} seats` : "Unlimited";
  const maxPerOrder = `${ticket.maxPerOrder || "4"} per order`;
  const salesWindow = ticket.saleStartsAt || ticket.saleEndsAt
    ? `${ticket.saleStartsAt || "Now"} to ${ticket.saleEndsAt || "event start"}`
    : "Open until event start";
  return [price, capacity, maxPerOrder, salesWindow];
}

function rsvpSummaryParts(rsvp: RsvpDraft) {
  const capacity = rsvp.capacity ? `${rsvp.capacity} spots` : "Unlimited";
  const window = rsvp.startAt || rsvp.endAt
    ? `${rsvp.startAt || "Now"} to ${rsvp.endAt || "event start"}`
    : "Open until event start";
  const attendeeInfo = rsvp.collectAttendeeInfo ? "Name and email required" : "Member profile used";
  const customFields = rsvp.registrationFields.length === 1
    ? "1 custom field"
    : `${rsvp.registrationFields.length} custom fields`;
  return [capacity, window, attendeeInfo, customFields];
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
  const [registrationPlacement, setRegistrationPlacement] = useState<EventRegistrationPlacement>(
    event?.registration_placement ?? "after_description"
  );
  const [recurrence, setRecurrence] = useState("none");
  const [recurrenceEndMode, setRecurrenceEndMode] = useState<"count" | "date" | "never">("count");
  const [accessLevels, setAccessLevels] = useState<string[]>(
    EVENT_ACCESS_LEVELS
      .filter((level) => (event ? hasAccess(event, level.value) : defaultAccessValues(defaults).includes(level.value)))
      .map((level) => level.value)
  );
  const initialTicketDrafts = ticketDraftFromEvent(event, initialTimezone);
  const [ticketTypes, setTicketTypes] = useState<TicketDraft[]>(() => initialTicketDrafts);
  const [expandedTicketIndex, setExpandedTicketIndex] = useState<number | null>(initialTicketDrafts.length ? null : 0);
  const initialRsvpDrafts = rsvpDraftFromEvent(event, initialTimezone);
  const [rsvpEnabled, setRsvpEnabled] = useState(initialRsvpDrafts.some((rsvp) => rsvp.status === "active"));
  const [rsvpTypes, setRsvpTypes] = useState<RsvpDraft[]>(() => initialRsvpDrafts);
  const [expandedRsvpIndex, setExpandedRsvpIndex] = useState<number | null>(initialRsvpDrafts.length ? null : 0);

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

  function addTicketType() {
    const nextIndex = ticketTypes.length;
    setTicketingMode("ticket_required");
    setTicketTypes([
      ...ticketTypes,
      { ...newTicketDraft(accessLevels), maxPerOrder: String(defaults?.defaultMaxPerOrder ?? 4) },
    ]);
    setExpandedTicketIndex(nextIndex);
  }

  function seedTicketTypeIfEmpty() {
    setTicketingMode("ticket_required");
    if (ticketTypes.length === 0) {
      setTicketTypes([{ ...newTicketDraft(accessLevels), maxPerOrder: String(defaults?.defaultMaxPerOrder ?? 4) }]);
      setExpandedTicketIndex(0);
    }
  }

  function duplicateTicket(index: number) {
    const source = ticketTypes[index];
    if (!source) return;
    setTicketTypes((current) => {
      const next = [...current];
      next.splice(index + 1, 0, duplicateTicketDraft(source));
      return next;
    });
    setExpandedTicketIndex(index + 1);
  }

  function removeTicket(index: number) {
    setTicketTypes((current) => current.filter((_, ticketIndex) => ticketIndex !== index));
    setExpandedTicketIndex((current) => {
      if (current === null) return current;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  }

  function updateRsvp(index: number, patch: Partial<RsvpDraft>) {
    setRsvpTypes((current) =>
      current.map((rsvp, rsvpIndex) => rsvpIndex === index ? { ...rsvp, ...patch } : rsvp)
    );
  }

  function addRsvpType() {
    const nextIndex = rsvpTypes.length;
    setRsvpEnabled(true);
    setRsvpTypes([...rsvpTypes, newRsvpDraft(startsAt)]);
    setExpandedRsvpIndex(nextIndex);
  }

  function seedRsvpTypeIfEmpty() {
    setRsvpEnabled(true);
    if (rsvpTypes.length === 0) {
      setRsvpTypes([newRsvpDraft(startsAt)]);
      setExpandedRsvpIndex(0);
    }
  }

  function duplicateRsvp(index: number) {
    const source = rsvpTypes[index];
    if (!source) return;
    setRsvpTypes((current) => {
      const next = [...current];
      next.splice(index + 1, 0, duplicateRsvpDraft(source));
      return next;
    });
    setExpandedRsvpIndex(index + 1);
  }

  function removeRsvp(index: number) {
    const next = rsvpTypes.filter((_, rsvpIndex) => rsvpIndex !== index);
    setRsvpTypes(next);
    if (next.length === 0) {
      setRsvpEnabled(false);
    }
    setExpandedRsvpIndex((current) => {
      if (current === null) return current;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  }

  function updateRegistrationField(
    rsvpIndex: number,
    fieldIndex: number,
    patch: Partial<EventRegistrationField>
  ) {
    setRsvpTypes((current) =>
      current.map((rsvp, index) => {
        if (index !== rsvpIndex) return rsvp;
        return {
          ...rsvp,
          registrationFields: rsvp.registrationFields.map((field, currentFieldIndex) =>
            currentFieldIndex === fieldIndex ? { ...field, ...patch } : field
          ),
        };
      })
    );
  }

  function addRegistrationField(rsvpIndex: number) {
    setRsvpTypes((current) =>
      current.map((rsvp, index) =>
        index === rsvpIndex
          ? { ...rsvp, registrationFields: [...rsvp.registrationFields, newRegistrationField()] }
          : rsvp
      )
    );
  }

  function removeRegistrationField(rsvpIndex: number, fieldIndex: number) {
    setRsvpTypes((current) =>
      current.map((rsvp, index) =>
        index === rsvpIndex
          ? { ...rsvp, registrationFields: rsvp.registrationFields.filter((_, currentIndex) => currentIndex !== fieldIndex) }
          : rsvp
      )
    );
  }

  function updateRegistrationOption(
    rsvpIndex: number,
    fieldIndex: number,
    optionIndex: number,
    patch: { label?: string; value?: string }
  ) {
    setRsvpTypes((current) =>
      current.map((rsvp, index) => {
        if (index !== rsvpIndex) return rsvp;
        return {
          ...rsvp,
          registrationFields: rsvp.registrationFields.map((field, currentFieldIndex) => {
            if (currentFieldIndex !== fieldIndex) return field;
            const options = field.options ?? [];
            return {
              ...field,
              options: options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? { ...option, ...patch } : option
              ),
            };
          }),
        };
      })
    );
  }

  function addRegistrationOption(rsvpIndex: number, fieldIndex: number) {
    setRsvpTypes((current) =>
      current.map((rsvp, index) => {
        if (index !== rsvpIndex) return rsvp;
        return {
          ...rsvp,
          registrationFields: rsvp.registrationFields.map((field, currentFieldIndex) => {
            if (currentFieldIndex !== fieldIndex) return field;
            const options = field.options ?? [];
            return { ...field, options: [...options, newRegistrationOption(field.id, options.length)] };
          }),
        };
      })
    );
  }

  function removeRegistrationOption(rsvpIndex: number, fieldIndex: number, optionIndex: number) {
    setRsvpTypes((current) =>
      current.map((rsvp, index) => {
        if (index !== rsvpIndex) return rsvp;
        return {
          ...rsvp,
          registrationFields: rsvp.registrationFields.map((field, currentFieldIndex) =>
            currentFieldIndex === fieldIndex
              ? { ...field, options: (field.options ?? []).filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex) }
              : field
          ),
        };
      })
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
      <form action={saveEvent} className="admin-form-card pb-6" data-event-form-ready={hydrated ? "true" : "false"}>
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
              <span>{formatLocalDraftDate(startsAt)}</span>
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
            <span className="admin-label">Event image</span>
            <EventImagePicker defaultValue={event?.image_url} />
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
                    <label htmlFor="recurrence_end_mode" className="admin-label">Ends</label>
                    <select
                      id="recurrence_end_mode"
                      name="recurrence_end_mode"
                      value={recurrenceEndMode}
                      onChange={(event) => setRecurrenceEndMode(event.target.value as "count" | "date" | "never")}
                      className="admin-select"
                    >
                      <option value="count">After a number of events</option>
                      <option value="date">On a date</option>
                      <option value="never">No end date</option>
                    </select>
                  </div>
                  {recurrenceEndMode === "count" ? (
                    <div className="admin-form-field">
                      <label htmlFor="recurrence_count" className="admin-label">Occurrences</label>
                      <input id="recurrence_count" name="recurrence_count" type="number" min="0" max="50" defaultValue="4" className="admin-input" />
                      <p className="admin-hint">Use 0 for unlimited. The next 60 occurrences are created now.</p>
                    </div>
                  ) : null}
                  {recurrenceEndMode === "date" ? (
                    <div className="admin-form-field">
                      <label htmlFor="recurrence_until" className="admin-label">End by</label>
                      <input id="recurrence_until" name="recurrence_until" type="date" required className="admin-input" />
                    </div>
                  ) : null}
                  {recurrenceEndMode === "never" ? (
                    <input type="hidden" name="recurrence_count" value="0" />
                  ) : null}
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
                <option value="livekit">LiveKit webinar</option>
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

        <FieldSection title="Tickets & RSVPs">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Registration</p>
                <h3 className="mt-1 font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                  Build admission for this event
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create tickets for paid admission, RSVPs for free registration, or leave both off when attendance is included.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="admin-btn admin-btn--outline"
                  onClick={addTicketType}
                >
                  New ticket
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--outline"
                  onClick={addRsvpType}
                >
                  New RSVP
                </button>
              </div>
            </div>
            {ticketingMode !== "ticket_required" && !rsvpEnabled ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/25 p-4 text-sm text-muted-foreground">
                No tickets or RSVPs have been created yet. Members can still view the event if it is published for their membership level.
              </div>
            ) : null}
            <div className="admin-form-grid-2 mt-4">
              <div className="admin-form-field">
                <label htmlFor="event_capacity" className="admin-label">Shared capacity</label>
                <input
                  id="event_capacity"
                  name="event_capacity"
                  defaultValue={event?.event_capacity ?? ""}
                  inputMode="numeric"
                  className="admin-input"
                  placeholder="Leave blank for unlimited"
                />
                <p className="admin-hint">Caps combined RSVPs, manual attendees, comps, paid tickets, and active ticket holds.</p>
              </div>
              <div className="admin-form-field">
                <label htmlFor="registration_placement" className="admin-label">Member page placement</label>
                <select
                  id="registration_placement"
                  name="registration_placement"
                  value={registrationPlacement}
                  onChange={(event) => setRegistrationPlacement(event.target.value as EventRegistrationPlacement)}
                  className="admin-select"
                >
                  <option value="below_hero">Below hero image</option>
                  <option value="after_description">After description</option>
                  <option value="sidebar">Sidebar card</option>
                </select>
              </div>
            </div>
          </div>

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
                    seedTicketTypeIfEmpty();
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
              {ticketTypes.map((ticket, index) => {
                const expanded = expandedTicketIndex === index;
                return (
                <div key={ticket.id ?? index} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Ticket type</p>
                      <h3 className="mt-1 font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                        {ticket.name || "Untitled ticket"}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={ticket.status === "active" ? "admin-badge admin-badge--published" : "admin-badge admin-badge--draft"}>
                          {ticket.status === "active" ? "Active" : "Disabled"}
                        </span>
                        {ticketSummaryParts(ticket).map((part) => (
                          <span key={part} className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline w-full sm:w-auto"
                        aria-expanded={expanded}
                        onClick={() => setExpandedTicketIndex(expanded ? null : index)}
                      >
                        {expanded ? "Done" : "Edit"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline w-full sm:w-auto"
                        onClick={() => duplicateTicket(index)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline w-full sm:w-auto"
                        onClick={() => updateTicket(index, { status: ticket.status === "active" ? "disabled" : "active" })}
                      >
                        {ticket.status === "active" ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline w-full sm:w-auto"
                        onClick={() => removeTicket(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                  <div className="mt-5 grid gap-4">
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
                    <div className="admin-form-field">
                      <label className="admin-label" htmlFor={`ticket_sale_start_${index}`}>Sales open</label>
                      <input
                        id={`ticket_sale_start_${index}`}
                        value={ticket.saleStartsAt}
                        onChange={(event) => updateTicket(index, { saleStartsAt: event.target.value })}
                        className="admin-input"
                        type="datetime-local"
                      />
                      <p className="admin-hint">Optional. Leave blank to make the ticket available immediately.</p>
                    </div>
                    <div className="admin-form-field">
                      <label className="admin-label" htmlFor={`ticket_sale_end_${index}`}>Sales close</label>
                      <input
                        id={`ticket_sale_end_${index}`}
                        value={ticket.saleEndsAt}
                        onChange={(event) => updateTicket(index, { saleEndsAt: event.target.value })}
                        className="admin-input"
                        type="datetime-local"
                      />
                      <p className="admin-hint">Optional. Leave blank to close sales at event start.</p>
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
                  ) : null}
                </div>
                );
              })}

              <button
                type="button"
                className="admin-btn admin-btn--outline justify-self-start"
                onClick={addTicketType}
              >
                Add ticket type
              </button>
            </div>
          ) : null}

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
                    if (event.target.checked && rsvpTypes.length === 0) {
                      seedRsvpTypeIfEmpty();
                      return;
                    }
                    setRsvpEnabled(event.target.checked);
                  }}
                  className="h-4 w-4"
                />
                Enable RSVP
              </label>
            </div>
          </div>

          {rsvpEnabled ? (
            <div className="grid gap-4">
              {rsvpTypes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/25 p-4 text-sm text-muted-foreground">
                  RSVP is enabled, but no RSVP types exist yet.
                </div>
              ) : null}
              {rsvpTypes.map((rsvp, index) => {
                const expanded = expandedRsvpIndex === index;
                return (
                <div key={rsvp.id ?? index} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">RSVP type</p>
                      <h3 className="mt-1 font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                        {rsvp.name || "RSVP"}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={rsvp.status === "active" ? "admin-badge admin-badge--published" : "admin-badge admin-badge--draft"}>
                          {rsvp.status === "active" ? "Active" : "Disabled"}
                        </span>
                        {rsvpSummaryParts(rsvp).map((part) => (
                          <span key={part} className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline w-full sm:w-auto"
                        aria-expanded={expanded}
                        onClick={() => setExpandedRsvpIndex(expanded ? null : index)}
                      >
                        {expanded ? "Done" : "Edit"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline w-full sm:w-auto"
                        onClick={() => duplicateRsvp(index)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline w-full sm:w-auto"
                        onClick={() => updateRsvp(index, { status: rsvp.status === "active" ? "disabled" : "active" })}
                      >
                        {rsvp.status === "active" ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline w-full sm:w-auto"
                        onClick={() => removeRsvp(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                  <div className="mt-5 grid gap-4">
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

                  <div className="mt-4 rounded-2xl border border-border bg-muted/25 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Registration questions
                        </p>
                        <h4 className="mt-1 font-heading text-base font-semibold text-foreground" style={{ textWrap: "balance" }}>
                          Custom fields
                        </h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Collect event-specific details during RSVP. Required fields are enforced before check-in records are created.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline w-full sm:w-auto"
                        onClick={() => addRegistrationField(index)}
                      >
                        Add field
                      </button>
                    </div>

                    {rsvp.registrationFields.length > 0 ? (
                      <div className="mt-4 grid gap-3">
                        {rsvp.registrationFields.map((field, fieldIndex) => (
                          <div key={field.id} className="rounded-xl border border-border bg-card p-3">
                            <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-end">
                              <div className="admin-form-field">
                                <label htmlFor={`rsvp_field_label_${index}_${fieldIndex}`} className="admin-label">
                                  Field label
                                </label>
                                <input
                                  id={`rsvp_field_label_${index}_${fieldIndex}`}
                                  value={field.label}
                                  onChange={(event) => updateRegistrationField(index, fieldIndex, { label: event.target.value })}
                                  className="admin-input"
                                  placeholder="Dietary needs"
                                />
                              </div>
                              <div className="admin-form-field">
                                <label htmlFor={`rsvp_field_type_${index}_${fieldIndex}`} className="admin-label">
                                  Type
                                </label>
                                <select
                                  id={`rsvp_field_type_${index}_${fieldIndex}`}
                                  value={field.type}
                                  onChange={(event) => {
                                    const nextType = event.target.value as EventRegistrationFieldType;
                                    updateRegistrationField(index, fieldIndex, {
                                      type: nextType,
                                      options: nextType === "select" ? field.options ?? [newRegistrationOption(field.id, 0)] : undefined,
                                    });
                                  }}
                                  className="admin-select"
                                >
                                  {EVENT_REGISTRATION_FIELD_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                className="admin-btn admin-btn--outline"
                                onClick={() => removeRegistrationField(index, fieldIndex)}
                              >
                                Remove
                              </button>
                            </div>

                            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                              <div className="admin-form-field">
                                <label htmlFor={`rsvp_field_help_${index}_${fieldIndex}`} className="admin-label">
                                  Helper text
                                </label>
                                <input
                                  id={`rsvp_field_help_${index}_${fieldIndex}`}
                                  value={field.helpText ?? ""}
                                  onChange={(event) => updateRegistrationField(index, fieldIndex, { helpText: event.target.value })}
                                  className="admin-input"
                                  placeholder="Optional member-facing hint"
                                />
                              </div>
                              <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(event) => updateRegistrationField(index, fieldIndex, { required: event.target.checked })}
                                  className="h-4 w-4"
                                />
                                Required
                              </label>
                            </div>

                            {field.type === "select" ? (
                              <div className="mt-3 rounded-xl border border-border bg-background p-3">
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="admin-label">Options</p>
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn--outline"
                                    onClick={() => addRegistrationOption(index, fieldIndex)}
                                  >
                                    Add option
                                  </button>
                                </div>
                                <div className="grid gap-2">
                                  {(field.options ?? []).map((option, optionIndex) => (
                                    <div key={option.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                                      <input
                                        value={option.label}
                                        onChange={(event) =>
                                          updateRegistrationOption(index, fieldIndex, optionIndex, { label: event.target.value })
                                        }
                                        className="admin-input"
                                        placeholder="Member-facing label"
                                      />
                                      <input
                                        value={option.value}
                                        onChange={(event) =>
                                          updateRegistrationOption(index, fieldIndex, optionIndex, { value: event.target.value })
                                        }
                                        className="admin-input"
                                        placeholder="Stored value"
                                      />
                                      <button
                                        type="button"
                                        className="admin-btn admin-btn--outline"
                                        onClick={() => removeRegistrationOption(index, fieldIndex, optionIndex)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                        No custom fields yet.
                      </p>
                    )}
                  </div>
                  </div>
                  ) : null}
                </div>
                );
              })}
              <button
                type="button"
                className="admin-btn admin-btn--outline justify-self-start"
                onClick={addRsvpType}
              >
                Add RSVP type
              </button>
            </div>
          ) : null}
        </FieldSection>

        <FieldSection title="Replay">
          <div className="admin-form-field">
            <label htmlFor="replay_url" className="admin-label">Replay URL</label>
            <input id="replay_url" name="replay_url" type="url" defaultValue={event?.replay_url ?? ""} className="admin-input" />
          </div>
        </FieldSection>

        <div className="mt-8 border-t border-border bg-card pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
