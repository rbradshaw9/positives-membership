/**
 * scripts/seed-coach-profile.ts
 *
 * Creates rbradshaw+coach@gmail.com as a test coach user with
 * full auth account, member record, coach profile, and default availability.
 *
 * Usage:
 *   npx tsx scripts/seed-coach-profile.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, and
 * SEED_COACH_PASSWORD in env.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Config ───────────────────────────────────────────────────────────────────

const COACH_EMAIL = "rbradshaw+coach@gmail.com";
const COACH_PASSWORD_ENV = "SEED_COACH_PASSWORD";
const COACH_PASSWORD = process.env[COACH_PASSWORD_ENV];

if (!COACH_PASSWORD) {
  console.error(`❌ Missing ${COACH_PASSWORD_ENV}. Set it in your local environment before seeding.`);
  process.exit(1);
}

const COACH_PROFILE_DATA = {
  display_name: "Ryan (Test Coach)",
  title: "Coaching Test Account",
  bio_short: "Test coaching account for development and QA.",
  routing_group: "general",
  accepts_new: true,
  is_active: true,
  session_duration_minutes: 60,
  buffer_minutes_after: 15,
};

// Mon–Fri 9am–5pm Eastern Time
const DEFAULT_AVAILABILITY = [
  { day_of_week: 1, start_minutes: 9 * 60, end_minutes: 17 * 60, timezone: "America/New_York" },
  { day_of_week: 2, start_minutes: 9 * 60, end_minutes: 17 * 60, timezone: "America/New_York" },
  { day_of_week: 3, start_minutes: 9 * 60, end_minutes: 17 * 60, timezone: "America/New_York" },
  { day_of_week: 4, start_minutes: 9 * 60, end_minutes: 17 * 60, timezone: "America/New_York" },
  { day_of_week: 5, start_minutes: 9 * 60, end_minutes: 17 * 60, timezone: "America/New_York" },
];

// ─── Script ───────────────────────────────────────────────────────────────────

async function run() {
  // ── Step 1: Auth user ────────────────────────────────────────────────────
  console.log("🔐 Looking up auth user:", COACH_EMAIL);

  const { data: listData } = await supabase.auth.admin.listUsers();
  const existingAuthUser = listData?.users?.find((u) => u.email === COACH_EMAIL);

  let authUserId: string;

  if (existingAuthUser) {
    authUserId = existingAuthUser.id;
    console.log("ℹ️  Auth user already exists:", authUserId);
    const { error: pwErr } = await supabase.auth.admin.updateUserById(authUserId, {
      password: COACH_PASSWORD,
      email_confirm: true,
    });
    if (pwErr) console.warn("⚠️  Could not update password:", pwErr.message);
    else console.log("✅ Password set.");
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: COACH_EMAIL,
      password: COACH_PASSWORD,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      console.error("❌ Failed to create auth user:", createErr?.message);
      process.exit(1);
    }
    authUserId = created.user.id;
    console.log("✅ Auth user created:", authUserId);
  }

  // ── Step 2: Member record ────────────────────────────────────────────────
  console.log("👤 Looking up member record...");

  const { data: existingMember } = await supabase
    .from("member")
    .select("id")
    .eq("id", authUserId)
    .single();

  let memberId: string;

  if (existingMember) {
    memberId = (existingMember as { id: string }).id;
    console.log("ℹ️  Member already exists:", memberId);
  } else {
    const { data: newMember, error: memberErr } = await supabase
      .from("member")
      .insert({
        id: authUserId,
        email: COACH_EMAIL,
        name: "Ryan (Test Coach)",
        subscription_status: "active",
        subscription_tier: "plus",
        password_set: true,
      })
      .select("id")
      .single();

    if (memberErr || !newMember) {
      console.error("❌ Failed to create member:", memberErr?.message);
      process.exit(1);
    }
    memberId = (newMember as { id: string }).id;
    console.log("✅ Member created:", memberId);
  }

  // ── Step 3: Coach profile ────────────────────────────────────────────────
  console.log("🎓 Setting up coach_profile...");

  const { data: existingCoach } = await supabase
    .from("coach_profile")
    .select("id")
    .eq("member_id", memberId)
    .single();

  let coachId: string;

  if (existingCoach) {
    coachId = (existingCoach as { id: string }).id;
    await supabase.from("coach_profile").update(COACH_PROFILE_DATA).eq("id", coachId);
    console.log("ℹ️  Coach profile updated:", coachId);
  } else {
    const { data: newCoach, error: coachErr } = await supabase
      .from("coach_profile")
      .insert({ ...COACH_PROFILE_DATA, member_id: memberId })
      .select("id")
      .single();

    if (coachErr || !newCoach) {
      console.error("❌ Failed to create coach_profile:", coachErr?.message);
      process.exit(1);
    }
    coachId = (newCoach as { id: string }).id;
    console.log("✅ Coach profile created:", coachId);
  }

  // ── Step 4: Availability ─────────────────────────────────────────────────
  console.log("🗓  Seeding availability (Mon–Fri 9am–5pm ET)...");

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

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const ampm = h < 12 ? "AM" : "PM";
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${dh}:${String(min).padStart(2, "0")} ${ampm}`;
  };
  for (const w of DEFAULT_AVAILABILITY) {
    console.log(`   ${dayNames[w.day_of_week]}: ${fmt(w.start_minutes)} – ${fmt(w.end_minutes)} ET`);
  }

  console.log("\n🎉 Done!");
  console.log(`   Login: ${COACH_EMAIL}`);
  console.log("   Manage availability: https://positives.life/account/coaching/availability");
  console.log("   Admin coaching view: https://positives.life/admin/coaching");
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
