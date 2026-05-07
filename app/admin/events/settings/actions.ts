"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { parseAccessLevels } from "@/lib/events/types";
import { ensureEventTicketAttendees } from "@/server/services/stripe/event-tickets";

function clean(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function numberOrNull(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeSlug(value: string, fallback: string) {
  return slugify(value || fallback) || slugify(fallback) || "event-resource";
}

function socialLinksFromForm(formData: FormData) {
  return {
    instagram: clean(formData.get("social_instagram")),
    linkedin: clean(formData.get("social_linkedin")),
    youtube: clean(formData.get("social_youtube")),
    facebook: clean(formData.get("social_facebook")),
  };
}

function safeReturnTo(formData: FormData, fallback: string) {
  const raw = clean(formData.get("return_to"));
  return raw.startsWith("/admin/events") && !raw.startsWith("//") ? raw : fallback;
}

function redirectWithStatus(target: string, status: string, key = "success"): never {
  const url = new URL(target, "https://positives.local");
  url.searchParams.set(key, status);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

export async function saveEventType(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const returnTo = safeReturnTo(formData, "/admin/events/types");
  const name = clean(formData.get("name"));
  if (!name) redirectWithStatus(returnTo, "type_name_required", "error");

  const slug = clean(formData.get("slug")) || slugify(name);
  const row = {
    slug,
    name,
    description: clean(formData.get("description")) || null,
    color: clean(formData.get("color")) || "#2EC4B6",
    sort_order: Number(clean(formData.get("sort_order")) || 100),
    is_active: checkbox(formData, "is_active"),
    updated_at: new Date().toISOString(),
  };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const result = id
    ? await supabase.from("event_type").update(row).eq("id", id)
    : await supabase.from("event_type").insert(row);

  if (result.error) {
    console.error("[events/settings] saveEventType", result.error.message);
    redirectWithStatus(returnTo, "type_save_failed", "error");
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin/events/settings");
  revalidatePath("/admin/events/types");
  redirectWithStatus(returnTo, id ? "type_updated" : "type_created");
}

export async function saveEventHost(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const returnTo = safeReturnTo(formData, "/admin/events/hosts");
  const name = clean(formData.get("name"));
  if (!name) redirectWithStatus(returnTo, "host_name_required", "error");
  const status = clean(formData.get("status")) || "published";

  const row = {
    name,
    slug: safeSlug(clean(formData.get("slug")), name),
    type: clean(formData.get("type")) || "person",
    bio: clean(formData.get("bio")) || null,
    image_url: clean(formData.get("image_url")) || null,
    brand_logo_url: clean(formData.get("brand_logo_url")) || null,
    email: clean(formData.get("email")) || null,
    phone: clean(formData.get("phone")) || null,
    website_url: clean(formData.get("website_url")) || null,
    support_email: clean(formData.get("support_email")) || null,
    social_links: socialLinksFromForm(formData),
    contact_visibility: clean(formData.get("contact_visibility")) || "logged_in",
    status,
    is_active: status !== "archived",
    updated_at: new Date().toISOString(),
  };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const result = id
    ? await supabase.from("event_host").update(row).eq("id", id)
    : await supabase.from("event_host").insert(row);

  if (result.error) {
    console.error("[events/settings] saveEventHost", result.error.message);
    redirectWithStatus(returnTo, "host_save_failed", "error");
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin/events/settings");
  revalidatePath("/admin/events/hosts");
  redirectWithStatus(returnTo, id ? "host_updated" : "host_created");
}

export async function saveEventVenue(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const returnTo = safeReturnTo(formData, "/admin/events/venues");
  const name = clean(formData.get("name"));
  if (!name) redirectWithStatus(returnTo, "venue_name_required", "error");
  const status = clean(formData.get("status")) || "published";

  const row = {
    name,
    slug: safeSlug(clean(formData.get("slug")), name),
    description: clean(formData.get("description")) || null,
    featured_image_url: clean(formData.get("featured_image_url")) || null,
    address_line1: clean(formData.get("address_line1")) || null,
    address_line2: clean(formData.get("address_line2")) || null,
    city: clean(formData.get("city")) || null,
    region: clean(formData.get("region")) || null,
    postal_code: clean(formData.get("postal_code")) || null,
    country: clean(formData.get("country")) || "US",
    email: clean(formData.get("email")) || null,
    phone: clean(formData.get("phone")) || null,
    website_url: clean(formData.get("website_url")) || null,
    map_url: clean(formData.get("map_url")) || null,
    show_map: checkbox(formData, "show_map"),
    show_map_link: checkbox(formData, "show_map_link"),
    accessibility_notes: clean(formData.get("accessibility_notes")) || null,
    parking_notes: clean(formData.get("parking_notes")) || null,
    latitude: numberOrNull(clean(formData.get("latitude"))),
    longitude: numberOrNull(clean(formData.get("longitude"))),
    is_virtual: checkbox(formData, "is_virtual"),
    status,
    is_active: status !== "archived",
    updated_at: new Date().toISOString(),
  };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const result = id
    ? await supabase.from("event_venue").update(row).eq("id", id)
    : await supabase.from("event_venue").insert(row);

  if (result.error) {
    console.error("[events/settings] saveEventVenue", result.error.message);
    redirectWithStatus(returnTo, "venue_save_failed", "error");
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin/events/settings");
  revalidatePath("/admin/events/venues");
  redirectWithStatus(returnTo, id ? "venue_updated" : "venue_created");
}

export async function saveEventSettings(formData: FormData) {
  const user = await requireAdmin();
  const returnTo = safeReturnTo(formData, "/admin/events/settings");
  const accessLevels = parseAccessLevels(formData.getAll("default_access_levels"));
  const maxPerOrder = Number(clean(formData.get("default_max_per_order")) || 4);
  const rows = [
    {
      key: "default_timezone",
      value: clean(formData.get("default_timezone")) || "America/New_York",
      description: "Default timezone for new events.",
      updated_by: user.id,
    },
    {
      key: "default_access_levels",
      value: accessLevels.length > 0 ? accessLevels : ["level_2"],
      description: "Default membership levels selected for new events.",
      updated_by: user.id,
    },
    {
      key: "ticket_sales_close",
      value: clean(formData.get("ticket_sales_close")) || "event_start",
      description: "Default ticket sales close behavior.",
      updated_by: user.id,
    },
    {
      key: "default_max_per_order",
      value: Number.isFinite(maxPerOrder) && maxPerOrder > 0 ? Math.round(maxPerOrder) : 4,
      description: "Default maximum tickets per order.",
      updated_by: user.id,
    },
  ];

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("event_setting").upsert(rows, { onConflict: "key" });
  if (error) {
    console.error("[events/settings] saveEventSettings", error.message);
    redirectWithStatus(returnTo, "settings_save_failed", "error");
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin/events/settings");
  redirectWithStatus(returnTo, "settings_saved");
}

function parseGuestLines(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const emailMatch = line.match(/<?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?/i);
      const email = emailMatch?.[1]?.trim() ?? null;
      const name = email && emailMatch ? line.replace(emailMatch[0], "").replace(/[<>()]/g, "").trim() : line;
      return {
        guest_name: name || null,
        guest_email: email,
      };
    });
}

export async function grantEventCompTickets(formData: FormData) {
  const user = await requireAdmin();
  const returnTo = safeReturnTo(formData, "/admin/events/ticketing");
  const ticketTypeId = clean(formData.get("ticket_type_id"));
  const memberEmail = clean(formData.get("member_email")).toLowerCase();
  const quantity = Math.max(1, Math.min(Number(clean(formData.get("quantity")) || 1), 20));
  if (!ticketTypeId || !memberEmail) redirectWithStatus(returnTo, "comp_required", "error");

  const supabase = asLooseSupabaseClient(getAdminClient());
  const [memberResult, ticketResult] = await Promise.all([
    supabase.from("member").select<{ id: string; email: string | null }>("id, email").eq("email", memberEmail).maybeSingle(),
    supabase
      .from("event_ticket_type")
      .select<{ id: string; event_id: string; name: string; price_cents: number; currency: string }>(
        "id, event_id, name, price_cents, currency"
      )
      .eq("id", ticketTypeId)
      .maybeSingle(),
  ]);

  if (memberResult.error || !memberResult.data || ticketResult.error || !ticketResult.data) {
    redirectWithStatus(returnTo, "comp_lookup_failed", "error");
  }

  const ticket = ticketResult.data;
  const member = memberResult.data;
  if (!ticket || !member) redirectWithStatus(returnTo, "comp_lookup_failed", "error");
  const { data: order, error: orderError } = await supabase
    .from("event_ticket_order")
    .insert({
      member_id: member.id,
      event_id: ticket.event_id,
      status: "comp",
      currency: ticket.currency,
      subtotal_cents: 0,
      total_cents: 0,
      quantity,
      paid_at: new Date().toISOString(),
      grant_note: clean(formData.get("grant_note")) || `Comped by ${user.email ?? user.id}.`,
      metadata: {
        source: "admin_comp",
        granted_by: user.id,
      },
    })
    .select<{ id: string }>("id")
    .single();

  if (orderError || !order) {
    console.error("[events/ticketing] grantEventCompTickets order", orderError?.message);
    redirectWithStatus(returnTo, "comp_save_failed", "error");
  }

  const { data: item, error: itemError } = await supabase
    .from("event_ticket_order_item")
    .insert({
      order_id: order.id,
      ticket_type_id: ticket.id,
      ticket_type_name: ticket.name,
      quantity,
      unit_amount_cents: 0,
      total_amount_cents: 0,
      currency: ticket.currency,
    })
    .select<{ id: string }>("id")
    .single();

  if (itemError || !item) {
    console.error("[events/ticketing] grantEventCompTickets item", itemError?.message);
    redirectWithStatus(returnTo, "comp_save_failed", "error");
  }

  const guests = parseGuestLines(clean(formData.get("guests")));
  const rows = Array.from({ length: quantity }, (_, index) => ({
    order_id: order.id,
    order_item_id: item.id,
    ticket_type_id: ticket.id,
    event_id: ticket.event_id,
    member_id: member.id,
    status: "comp",
    guest_name: guests[index]?.guest_name ?? null,
    guest_email: guests[index]?.guest_email ?? null,
  }));
  const { error: ticketError } = await supabase.from("event_ticket").insert(rows);
  if (ticketError) {
    console.error("[events/ticketing] grantEventCompTickets tickets", ticketError.message);
    redirectWithStatus(returnTo, "comp_save_failed", "error");
  }

  try {
    await ensureEventTicketAttendees(order.id);
  } catch (error) {
    console.error("[events/ticketing] grantEventCompTickets attendees", error instanceof Error ? error.message : String(error));
    redirectWithStatus(returnTo, "comp_save_failed", "error");
  }

  await supabase.from("activity_event").insert({
    member_id: member.id,
    event_type: "event_ticket_comped",
    metadata: {
      event_id: ticket.event_id,
      order_id: order.id,
      ticket_type_id: ticket.id,
      quantity,
      granted_by: user.id,
    },
  });

  revalidatePath("/events");
  revalidatePath("/admin/events/ticketing");
  redirectWithStatus(returnTo, "comp_granted");
}
