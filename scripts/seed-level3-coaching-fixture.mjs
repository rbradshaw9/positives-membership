#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase env vars. Load .env.local before running this script.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const fixture = {
  title: "Level 3 Coaching Placeholder: Practicing Boundaries with Confidence",
  excerpt: "Placeholder upcoming coaching call used to verify the Level 3 live-join experience.",
  description:
    "Placeholder Level 3 coaching fixture for QA. Replace this with the real coaching title, Zoom link, and session framing when the weekly schedule is finalized.",
  type: "coaching_call",
  status: "published",
  is_active: true,
  source: "admin",
  tier_min: "level_3",
  starts_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  duration_seconds: 60 * 60,
  join_url: "https://us02web.zoom.us/j/82345678910?pwd=level3_placeholder_call",
  resource_links: [],
  tags: ["level-3", "coaching", "placeholder"],
};

const { data: existing, error: lookupError } = await supabase
  .from("content")
  .select("id")
  .eq("title", fixture.title)
  .maybeSingle();

if (lookupError) {
  throw lookupError;
}

if (existing?.id) {
  const { error: updateError } = await supabase
    .from("content")
    .update(fixture)
    .eq("id", existing.id);

  if (updateError) {
    throw updateError;
  }

  console.log(`updated ${fixture.title}`);
} else {
  const { error: insertError } = await supabase.from("content").insert(fixture);

  if (insertError) {
    throw insertError;
  }

  console.log(`inserted ${fixture.title}`);
}
