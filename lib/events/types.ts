export const EVENT_ACCESS_LEVELS = [
  { value: "level_1", label: "Membership" },
  { value: "level_2", label: "Membership + Events" },
  { value: "level_3", label: "Coaching Circle" },
  { value: "level_4", label: "Executive Coaching" },
] as const;

export type EventAccessLevel = (typeof EVENT_ACCESS_LEVELS)[number]["value"];
export type EventStatus = "draft" | "ready_for_review" | "published" | "canceled" | "postponed" | "archived";
export type EventVirtualMode = "none" | "manual" | "zoom";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export type EventTypeOption = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
};

export type EventHostOption = {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  email: string | null;
};

export type EventVenueOption = {
  id: string;
  name: string;
  description: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  map_url: string | null;
  is_virtual: boolean;
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
