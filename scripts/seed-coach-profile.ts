/**
 * scripts/seed-coach-profile.ts
 *
 * One-time seed script to create Dr. Paul Jenkins' coach profile
 * and set his default weekly availability.
 *
 * Usage:
 *   npx tsx scripts/seed-coach-profile.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ─── Config ───────────────────────────────────────────────────────────────────
// Set this to Dr. Paul's actual member ID from the member table
const COACH_MEMBER_EMAIL = "paul@positives.life"; // used to look up member_id

const COACH_CONFIG = {
  display_name: "Dr. Paul Jenkins",
  title: "Executive Coach",
  bio_short:
    "Dr. Paul Jenkins is a licensed psychologist and executive coach with 20+ years of experience helping high-performers build clarity, confidence, and momentum.",
  routing_group: "general",
  accepts_new: true,
  is_active: true,
  session_duration_minutes: 60,
  buffer_minutes_after: 15,
};

// Default weekly availability: Mon–Fri 9am–5pm Mountain Time
const DEFAULT_AVAILABILITY = [
  { day_of_week: 1, start_minutes: 9 * 60, end_minutes: 17 * 60, timezone: "America/Denver" },
  { day_of_week: 2, start_minutes: 9 * 60, end_minutes: 17 * 60, timezone: "America/Denver" },
  { day_of_week: 3, start_minutes: 9 * 60, end_minutes: 17 * 60, timezone: "America/Denver" },
  { day_of_week: 4, start_minutes: 9 * 60, end_minutes: 17 * 60, timezone: "America/Denver" },
  { day_of_week: 5, start_minutes: 9 * 60, end_minutes: 17 * 60, timezone: "America/Denver" },
];

// ─── Script ───────────────────────────────────────────────────────────────────

async function run() {
  console.log("🔍 Looking up member by email:", COACH_MEMBER_EMAIL);

  const { data: member, error: memberErr } = await supabase
    .from("member")
    .select("id, email, name")
    .eq("email", COACH_MEMBER_EMAIL)
    .single();

  if (memberErr || !member) {
    console.error("❌ Member not found:", memberErr?.message ?? "no row");
    console.log("   → Update COACH_MEMBER_EMAIL in this script to the correct email.");
    process.exit(1);
  }

  console.log(`✅ Found member: ${member.name} (${member.id})`);

  // Check for existing coach profile
  const { data: existing } = await supabase
    .from("coach_profile")
    .select("id")
    .eq("member_id", member.id)
    .single();

  let coachId: string;

  if (existing) {
    coachId = existing.id;
    console.log("ℹ️  Coach profile already exists:", coachId);
    console.log("   → Updating profile details...");
    const { error: updateErr } = await supabase
      .from("coach_profile")
      .update(COACH_CONFIG)
      .eq("id", coachId);
    if (updateErr) {
      console.error("❌ Failed to update coach profile:", updateErr.message);
      process.exit(1);
    }
    console.log("✅ Coach profile updated.");
  } else {
    const { data: created, error: createErr } = await supabase
      .from("coach_profile")
      .insert({ ...COACH_CONFIG, member_id: member.id })
      .select("id")
      .single();
    if (createErr || !created) {
      console.error("❌ Failed to create coach profile:", createErr?.message);
      process.exit(1);
    }
    coachId = created.id;
    console.log("✅ Coach profile created:", coachId);
  }

  // Seed availability (replace all)
  console.log("🗓  Seeding weekly availability...");
  await supabase.from("coach_availability").delete().eq("coach_id", coachId);

  const inserts = DEFAULT_AVAILABILITY.map((w) => ({
    coach_id: coachId,
    ...w,
    is_active: true,
  }));

  const { error: availErr } = await supabase.from("coach_availability").insert(inserts);
  if (availErr) {
    console.error("❌ Failed to seed availability:", availErr.message);
    process.exit(1);
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const w of DEFAULT_AVAILABILITY) {
    const h = (m: number) => {
      const hr = Math.floor(m / 60);
      const min = m % 60;
      const ampm = hr < 12 ? "AM" : "PM";
      const dh = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
      return `${dh}:${String(min).padStart(2, "0")} ${ampm}`;
    };
    console.log(
      `   ${days[w.day_of_week]}: ${h(w.start_minutes)} – ${h(w.end_minutes)} ${w.timezone}`
    );
  }

  console.log("\n🎉 Done! Dr. Paul's coach profile and availability are set.");
  console.log("   Members can now book sessions via /account/coaching");
  console.log("   Coach can manage availability at /account/coaching/availability");
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
