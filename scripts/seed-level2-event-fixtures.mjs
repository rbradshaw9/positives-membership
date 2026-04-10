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

const fixtures = [
  {
    title: "Level 2 Event Placeholder: Reframing Stress in Real Time",
    excerpt: "Placeholder upcoming event used to verify the Level 2 /events experience.",
    description:
      "Placeholder event fixture for QA. Replace this with the real workshop title, Zoom link, and event description when the live calendar is finalized.",
    type: "coaching_call",
    status: "published",
    is_active: true,
    source: "admin",
    tier_min: "level_2",
    starts_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration_seconds: 60 * 60,
    join_url: "https://zoom.us/j/level2-placeholder-event",
    resource_links: [],
    tags: ["level-2", "event", "placeholder"],
  },
  {
    title: "Level 2 Event Placeholder Replay: Resetting After a Hard Week",
    excerpt: "Placeholder replay used to verify the Level 2 events archive state.",
    description:
      "Placeholder replay fixture for QA. Replace this with a real replay asset or published recording details when event media is ready.",
    type: "coaching_call",
    status: "published",
    is_active: true,
    source: "admin",
    tier_min: "level_2",
    starts_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration_seconds: 45 * 60,
    resource_links: [],
    tags: ["level-2", "event", "placeholder", "replay"],
  },
];

for (const fixture of fixtures) {
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
    continue;
  }

  const { error: insertError } = await supabase.from("content").insert(fixture);
  if (insertError) {
    throw insertError;
  }

  console.log(`inserted ${fixture.title}`);
}
