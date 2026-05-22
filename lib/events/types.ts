export const EVENT_ACCESS_LEVELS = [
  { value: "level_1", label: "Membership" },
  { value: "level_2", label: "Membership + Events" },
  { value: "level_3", label: "Coaching Circle" },
  { value: "level_4", label: "Executive Coaching" },
] as const;

export type EventAccessLevel = (typeof EVENT_ACCESS_LEVELS)[number]["value"];
export type EventStatus = "draft" | "ready_for_review" | "published" | "canceled" | "postponed" | "archived";
export type EventVirtualMode = "none" | "manual" | "zoom" | "livekit";
export type EventTicketingMode = "included" | "ticket_required";
export type EventRegistrationPlacement = "below_hero" | "after_description" | "sidebar";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";
export type EventTicketTypeStatus = "active" | "disabled" | "archived";
export type EventTicketOrderStatus = "pending" | "paid" | "refunded" | "chargeback" | "canceled" | "comp" | "expired";
export type EventTicketStatus = "pending" | "active" | "refunded" | "chargeback" | "canceled" | "comp" | "expired";
export type EventRegistrationFieldType = "short_text" | "long_text" | "email" | "phone" | "select" | "checkbox";

export type EventRegistrationFieldOption = {
  id: string;
  label: string;
  value: string;
};

export type EventRegistrationField = {
  id: string;
  label: string;
  type: EventRegistrationFieldType;
  required: boolean;
  helpText?: string;
  options?: EventRegistrationFieldOption[];
};

export type EventTypeOption = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
};

export type EventHostOption = {
  id: string;
  slug: string;
  name: string;
  type: "person" | "organization" | "brand" | "internal_team";
  bio: string | null;
  image_url: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  social_links: Record<string, string>;
  contact_visibility: "public" | "logged_in" | "private";
  status: "published" | "draft" | "archived";
  brand_logo_url: string | null;
  support_email: string | null;
};

export type EventVenueOption = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  featured_image_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  map_url: string | null;
  show_map: boolean;
  show_map_link: boolean;
  accessibility_notes: string | null;
  parking_notes: string | null;
  is_virtual: boolean;
  status: "published" | "draft" | "archived";
};

export type ZoomConnectionOption = {
  id: string;
  label: string;
  owner_kind: "platform" | "coach";
  zoom_user_email: string | null;
  status: "active" | "needs_reconnect" | "disabled";
};

export function accessLevelLabel(value: string) {
  return EVENT_ACCESS_LEVELS.find((level) => level.value === value)?.label ?? value;
}

export function parseAccessLevels(values: FormDataEntryValue[]) {
  const allowed = new Set(EVENT_ACCESS_LEVELS.map((level) => level.value));
  return values.map(String).filter((value): value is EventAccessLevel => allowed.has(value as EventAccessLevel));
}

export function normalizeEventAccessLevels(values: unknown) {
  if (!Array.isArray(values)) return [];
  return parseAccessLevels(values.map((value) => String(value)));
}

export const EVENT_REGISTRATION_FIELD_TYPES: Array<{ value: EventRegistrationFieldType; label: string }> = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
];

const REGISTRATION_FIELD_TYPE_VALUES = new Set(EVENT_REGISTRATION_FIELD_TYPES.map((type) => type.value));

function fieldIdFromLabel(label: string, fallback: string) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || fallback;
}

export function normalizeRegistrationFields(value: unknown): EventRegistrationField[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((item, index): EventRegistrationField | null => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      const label = String(raw.label ?? "").trim().slice(0, 120);
      if (!label) return null;
      const type = REGISTRATION_FIELD_TYPE_VALUES.has(raw.type as EventRegistrationFieldType)
        ? (raw.type as EventRegistrationFieldType)
        : "short_text";
      let id = String(raw.id ?? "").trim() || fieldIdFromLabel(label, `field_${index + 1}`);
      id = id
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 48) || `field_${index + 1}`;
      if (seen.has(id)) {
        const suffix = `_${index + 1}`;
        id = `${id.slice(0, 48 - suffix.length)}${suffix}`;
      }
      seen.add(id);
      const options = Array.isArray(raw.options)
        ? raw.options
            .map((option, optionIndex): EventRegistrationFieldOption | null => {
              if (!option || typeof option !== "object") return null;
              const optionRaw = option as Record<string, unknown>;
              const optionLabel = String(optionRaw.label ?? optionRaw.value ?? "").trim().slice(0, 100);
              if (!optionLabel) return null;
              const optionValue = String(optionRaw.value ?? optionLabel)
                .trim()
                .slice(0, 100);
              return {
                id: String(optionRaw.id ?? `${id}_option_${optionIndex + 1}`).trim(),
                label: optionLabel,
                value: optionValue,
              };
            })
            .filter((option): option is EventRegistrationFieldOption => Boolean(option))
        : [];
      return {
        id,
        label,
        type,
        required: raw.required === true,
        helpText: String(raw.helpText ?? raw.help_text ?? "").trim().slice(0, 200) || undefined,
        options: type === "select" ? options : undefined,
      };
    })
    .filter((field): field is EventRegistrationField => Boolean(field))
    .slice(0, 12);
}
