"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

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

function redirectToSettings(anchor: string, status: string) {
  redirect(`/admin/events/settings?success=${status}#${anchor}`);
}

export async function saveEventType(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  if (!name) redirect("/admin/events/settings?error=type_name_required#types");

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
    redirect("/admin/events/settings?error=type_save_failed#types");
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin/events/settings");
  redirectToSettings("types", id ? "type_updated" : "type_created");
}

export async function saveEventHost(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  if (!name) redirect("/admin/events/settings?error=host_name_required#hosts");

  const row = {
    name,
    bio: clean(formData.get("bio")) || null,
    image_url: clean(formData.get("image_url")) || null,
    email: clean(formData.get("email")) || null,
    website_url: clean(formData.get("website_url")) || null,
    is_active: checkbox(formData, "is_active"),
    updated_at: new Date().toISOString(),
  };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const result = id
    ? await supabase.from("event_host").update(row).eq("id", id)
    : await supabase.from("event_host").insert(row);

  if (result.error) {
    console.error("[events/settings] saveEventHost", result.error.message);
    redirect("/admin/events/settings?error=host_save_failed#hosts");
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin/events/settings");
  redirectToSettings("hosts", id ? "host_updated" : "host_created");
}

export async function saveEventVenue(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  if (!name) redirect("/admin/events/settings?error=venue_name_required#venues");

  const row = {
    name,
    description: clean(formData.get("description")) || null,
    address_line1: clean(formData.get("address_line1")) || null,
    address_line2: clean(formData.get("address_line2")) || null,
    city: clean(formData.get("city")) || null,
    region: clean(formData.get("region")) || null,
    postal_code: clean(formData.get("postal_code")) || null,
    country: clean(formData.get("country")) || "US",
    phone: clean(formData.get("phone")) || null,
    website_url: clean(formData.get("website_url")) || null,
    map_url: clean(formData.get("map_url")) || null,
    latitude: numberOrNull(clean(formData.get("latitude"))),
    longitude: numberOrNull(clean(formData.get("longitude"))),
    is_virtual: checkbox(formData, "is_virtual"),
    is_active: checkbox(formData, "is_active"),
    updated_at: new Date().toISOString(),
  };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const result = id
    ? await supabase.from("event_venue").update(row).eq("id", id)
    : await supabase.from("event_venue").insert(row);

  if (result.error) {
    console.error("[events/settings] saveEventVenue", result.error.message);
    redirect("/admin/events/settings?error=venue_save_failed#venues");
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin/events/settings");
  redirectToSettings("venues", id ? "venue_updated" : "venue_created");
}
