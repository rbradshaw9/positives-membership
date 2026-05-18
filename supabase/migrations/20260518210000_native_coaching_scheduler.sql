-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: native_coaching_scheduler
-- Created:   2026-05-18
--
-- Adds the full native scheduling engine, replacing Calendly dependency.
--
-- Tables:
--   coach_profile           — coaches registered in the system
--   coach_availability      — weekly recurring availability windows
--   coaching_booking        — native bookings (source of truth)
--   member_coaching_profile — preferred coach assignment per member
--
-- Video sessions are provided by Livekit (self-hosted).
-- Livekit room names are stored on coaching_booking for join URL generation.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ─────────────────────────────────────────────────────────────────────

create type coaching_booking_status as enum (
  'pending',      -- created, awaiting confirmation (unused in MVP — auto-confirmed)
  'confirmed',    -- booking locked in, Livekit room created
  'completed',    -- session finished
  'canceled',     -- member or coach canceled
  'noshow'        -- member did not show up
);

create type coach_routing_group as enum (
  'general',      -- available for round-robin to any new member
  'premium',      -- Level 4 only
  'all'           -- all routing groups
);

-- ── coach_profile ──────────────────────────────────────────────────────────────

create table coach_profile (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid unique references member(id) on delete cascade,

  display_name      text not null,
  title             text,                    -- e.g. "Executive Coach"
  bio_short         text,                    -- 1–2 sentence bio shown on booking page
  avatar_url        text,

  -- Routing
  routing_group     coach_routing_group not null default 'general',
  accepts_new       boolean not null default true,   -- false = existing members only
  is_active         boolean not null default true,

  -- Session defaults
  session_duration_minutes  int not null default 60,
  buffer_minutes_after      int not null default 15, -- gap blocked after each session

  -- Optional Zoom fallback (uuid stored, FK added later if zoom_connection table exists)
  zoom_connection_id  uuid,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger coach_profile_updated_at
  before update on coach_profile
  for each row execute procedure set_coaching_pack_updated_at();

create index coach_profile_active_idx on coach_profile (is_active, accepts_new);

-- ── coach_availability ────────────────────────────────────────────────────────
-- Weekly recurring windows. day_of_week: 0=Sun, 1=Mon, ..., 6=Sat
-- Times stored as minutes-from-midnight in the coach's local timezone.

create table coach_availability (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references coach_profile(id) on delete cascade,

  day_of_week   int not null check (day_of_week between 0 and 6),
  start_minutes int not null check (start_minutes >= 0 and start_minutes < 1440),
  end_minutes   int not null check (end_minutes > start_minutes and end_minutes <= 1440),

  timezone      text not null default 'America/New_York',
  is_active     boolean not null default true,

  created_at    timestamptz not null default now()
);

create index coach_availability_coach_idx on coach_availability (coach_id, day_of_week);

-- ── coaching_booking ──────────────────────────────────────────────────────────

create table coaching_booking (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references member(id) on delete cascade,
  coach_id          uuid not null references coach_profile(id),
  pack_id           uuid references coaching_session_pack(id) on delete set null,

  status            coaching_booking_status not null default 'confirmed',

  -- Scheduling
  scheduled_at      timestamptz not null,    -- session start (UTC)
  duration_minutes  int not null default 60,
  timezone          text not null default 'America/New_York',  -- member's timezone at booking time

  -- Livekit room
  livekit_room_name text unique,             -- e.g. "coaching-{bookingId}"
  livekit_room_created_at timestamptz,

  -- Optional Zoom fallback
  zoom_join_url     text,
  zoom_meeting_id   text,

  -- Intake / notes
  member_intake     text,                    -- member's pre-session notes
  coach_notes       text,                    -- coach's post-session notes (coach-only)
  member_reflection text,                    -- member's post-session reflection

  -- Cancellation
  canceled_at       timestamptz,
  canceled_by       text,                    -- 'member' | 'coach' | 'admin'
  cancel_reason     text,

  -- Admin
  admin_note        text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger coaching_booking_updated_at
  before update on coaching_booking
  for each row execute procedure set_coaching_pack_updated_at();

create index coaching_booking_member_idx on coaching_booking (member_id, scheduled_at desc);
create index coaching_booking_coach_idx  on coaching_booking (coach_id, scheduled_at);
create index coaching_booking_upcoming_idx on coaching_booking (scheduled_at)
  where status = 'confirmed';

-- ── member_coaching_profile ───────────────────────────────────────────────────

create table member_coaching_profile (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid unique not null references member(id) on delete cascade,

  -- Preferred coach (set after first session, or admin-assigned)
  preferred_coach_id    uuid references coach_profile(id) on delete set null,
  preferred_coach_set_at timestamptz,
  preferred_coach_set_by text,   -- 'system' | 'admin' | 'member'

  -- Routing override
  routing_override      text,    -- 'round_robin' | 'preferred_only' | null (default)

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger member_coaching_profile_updated_at
  before update on member_coaching_profile
  for each row execute procedure set_coaching_pack_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table coach_profile           enable row level security;
alter table coach_availability      enable row level security;
alter table coaching_booking        enable row level security;
alter table member_coaching_profile enable row level security;

-- Members can read active coach profiles (for booking page)
create policy "public: read active coaches"
  on coach_profile for select
  using (is_active = true);

-- Members can read availability of active coaches
create policy "public: read coach availability"
  on coach_availability for select
  using (is_active = true);

-- Members can read their own bookings
create policy "member: read own bookings"
  on coaching_booking for select
  using (auth.uid() = member_id);

-- Members can update their own bookings (intake notes, reflection)
create policy "member: update own booking intake"
  on coaching_booking for update
  using (auth.uid() = member_id)
  with check (auth.uid() = member_id);

-- Members can read their own coaching profile
create policy "member: read own coaching profile"
  on member_coaching_profile for select
  using (auth.uid() = member_id);

-- Coaches can read bookings assigned to them
create policy "coach: read own bookings"
  on coaching_booking for select
  using (
    coach_id in (
      select id from coach_profile where member_id = auth.uid()
    )
  );

-- Service role bypasses RLS — no additional policies needed for admin/API routes.

-- ── Comments ──────────────────────────────────────────────────────────────────

comment on table coach_profile is
  'Coaches available for booking. One row per coach. member_id links to their Positives account.';

comment on table coach_availability is
  'Weekly recurring availability windows per coach. Slots are computed from these rows minus existing bookings.';

comment on table coaching_booking is
  'Native coaching bookings. Source of truth for all sessions booked through the Positives platform.';

comment on table member_coaching_profile is
  'Per-member coaching preferences including preferred coach assignment.';

comment on column coaching_booking.livekit_room_name is
  'Livekit room created at booking time. Used to generate join tokens for member and coach.';

comment on column coach_availability.start_minutes is
  'Minutes from midnight in coach''s local timezone. E.g. 540 = 9:00 AM.';
