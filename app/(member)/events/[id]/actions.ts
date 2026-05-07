"use server";

import { redirect } from "next/navigation";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { normalizeRegistrationFields } from "@/lib/events/types";
import { createEventTicketPaymentOrCheckout } from "@/server/services/stripe/event-tickets";
import { sendEventAttendeeConfirmationSafely } from "@/server/services/events/event-confirmations";
import type { EventRegistrationField } from "@/lib/events/types";

type TicketItem = {
  ticket_type_id: string;
  quantity: number;
  guests?: Array<{ name?: string; email?: string }>;
};

function intValue(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function parseGuests(value: FormDataEntryValue | null) {
  const lines = String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const emailMatch = line.match(/<?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?/i);
    const email = emailMatch?.[1]?.trim();
    const name = email && emailMatch ? line.replace(emailMatch[0], "").replace(/[<>()]/g, "").trim() : line;
    return {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
    };
  });
}

function eventRedirect(eventId: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  redirect(`/events/${eventId}?${qs.toString()}`);
}

function cleanFieldValue(field: EventRegistrationField, value: FormDataEntryValue | null) {
  if (field.type === "checkbox") return value === "on" || value === "true";
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.slice(0, field.type === "long_text" ? 2000 : 300);
}

function collectCustomFieldValues(fields: EventRegistrationField[], formData: FormData) {
  const values: Record<string, string | boolean> = {};
  for (const field of fields) {
    const value = cleanFieldValue(field, formData.get(`custom_${field.id}`));
    if (field.type === "checkbox") {
      if (value === true) values[field.id] = true;
    } else if (value) {
      values[field.id] = value;
    }
  }
  return values;
}

function customFieldsAreValid(fields: EventRegistrationField[], values: Record<string, string | boolean>) {
  for (const field of fields) {
    const value = values[field.id];
    if (field.required) {
      if (field.type === "checkbox" && value !== true) return false;
      if (field.type !== "checkbox" && !String(value ?? "").trim()) return false;
    }
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return false;
    if (field.type === "select" && value) {
      const allowed = new Set((field.options ?? []).map((option) => option.value || option.label));
      if (allowed.size > 0 && !allowed.has(String(value))) return false;
    }
  }
  return true;
}

async function getRsvpRegistrationFields(eventId: string, rsvpTypeId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const result = await supabase
    .from("event_rsvp_type")
    .select<{ registration_fields: unknown }>("registration_fields")
    .eq("event_id", eventId)
    .eq("id", rsvpTypeId)
    .maybeSingle();

  if (result.error?.message.includes("registration_fields")) return [];
  if (result.error) throw new Error(result.error.message);
  return normalizeRegistrationFields(result.data?.registration_fields);
}

export async function purchaseEventTickets(formData: FormData) {
  const member = await requireActiveMember();
  const eventId = String(formData.get("event_id") ?? "").trim();
  if (!eventId) redirect("/events?ticket_error=event_missing");
  const memberTier = member.subscription_tier;
  if (!memberTier) eventRedirect(eventId, { ticket_error: "membership_required" });

  const ticketTypeIds = formData
    .getAll("ticket_type_id")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const items: TicketItem[] = ticketTypeIds
    .map((ticketTypeId) => ({
      ticket_type_id: ticketTypeId,
      quantity: intValue(formData.get(`quantity_${ticketTypeId}`)),
      guests: parseGuests(formData.get(`guests_${ticketTypeId}`)),
    }))
    .filter((item) => item.quantity > 0);

  if (items.length === 0) eventRedirect(eventId, { ticket_error: "quantity_required" });

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: orderId, error } = await supabase.rpc("reserve_event_ticket_order", {
    p_member_id: member.id,
    p_event_id: eventId,
    p_member_tier: memberTier,
    p_items: items,
  });

  if (error || !orderId) {
    console.warn("[event tickets] reservation failed:", error?.message);
    eventRedirect(eventId, { ticket_error: "reservation_failed" });
  }

  try {
    const result = await createEventTicketPaymentOrCheckout(String(orderId));
    redirect(result.url);
  } catch (error) {
    console.error("[event tickets] checkout failed:", error instanceof Error ? error.message : String(error));
    eventRedirect(eventId, { ticket_error: "checkout_failed" });
  }
}

export async function registerEventRsvp(formData: FormData) {
  const member = await requireActiveMember();
  const eventId = String(formData.get("event_id") ?? "").trim();
  const rsvpTypeId = String(formData.get("rsvp_type_id") ?? "").trim();
  if (!eventId) redirect("/events?rsvp_error=event_missing");
  if (!rsvpTypeId) eventRedirect(eventId, { rsvp_error: "rsvp_missing" });
  if (!member.subscription_tier) eventRedirect(eventId, { rsvp_error: "membership_required" });

  const attendeeName = String(formData.get("attendee_name") ?? "").trim();
  const attendeeEmail = String(formData.get("attendee_email") ?? "").trim();

  const supabase = asLooseSupabaseClient(getAdminClient());
  let customFields: EventRegistrationField[] = [];
  try {
    customFields = await getRsvpRegistrationFields(eventId, rsvpTypeId);
  } catch (error) {
    console.warn("[event rsvp] field lookup failed:", error instanceof Error ? error.message : String(error));
    eventRedirect(eventId, { rsvp_error: "registration_failed" });
  }
  const customFieldValues = collectCustomFieldValues(customFields, formData);
  if (!customFieldsAreValid(customFields, customFieldValues)) {
    eventRedirect(eventId, { rsvp_error: "fields_required" });
  }

  const rpcArgs = {
    p_member_id: member.id,
    p_event_id: eventId,
    p_member_tier: member.subscription_tier,
    p_rsvp_type_id: rsvpTypeId,
    p_attendee_name: attendeeName || null,
    p_attendee_email: attendeeEmail || null,
  };
  const { data: attendeeId, error } = Object.keys(customFieldValues).length > 0
    ? await supabase.rpc("register_event_rsvp", {
        ...rpcArgs,
        p_custom_field_values: customFieldValues,
      })
    : await supabase.rpc("register_event_rsvp", rpcArgs);

  if (error) {
    console.warn("[event rsvp] registration failed:", error.message);
    eventRedirect(eventId, { rsvp_error: "registration_failed" });
  }

  if (attendeeId) {
    await sendEventAttendeeConfirmationSafely(String(attendeeId));
  }

  eventRedirect(eventId, { rsvp: "success" });
}
