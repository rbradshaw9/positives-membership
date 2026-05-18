-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: coaching_session_packs
-- Created:   2026-05-18
--
-- Adds two tables to support coaching session purchase and tracking:
--
--   coaching_session_pack   — a purchased (or granted) block of sessions
--   coaching_session_log    — one row per session booking (Calendly event)
--
-- Pack types:
--   single        $225 one-time, 1 session, no expiry
--   punch_pass    $1,997 one-time, 10 sessions, 6-month expiry
--   earned        free sessions granted via referral/streak/anniversary
--
-- Session log status lifecycle:
--   scheduled → completed | canceled | noshow
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Pack type enum ────────────────────────────────────────────────────────────

create type coaching_pack_type as enum (
  'single',
  'punch_pass',
  'earned'
);

-- ── Session log status enum ───────────────────────────────────────────────────

create type coaching_session_status as enum (
  'scheduled',
  'completed',
  'canceled',
  'noshow',
  'unmatched'   -- Calendly booking with no eligible pack found
);

-- ── coaching_session_pack ─────────────────────────────────────────────────────

create table coaching_session_pack (
  id                          uuid primary key default gen_random_uuid(),
  member_id                   uuid not null references member(id) on delete cascade,

  pack_type                   coaching_pack_type not null,
  sessions_total              int  not null check (sessions_total > 0),
  sessions_remaining          int  not null check (sessions_remaining >= 0),

  -- Stripe fields (null for earned packs)
  stripe_customer_id          text,
  stripe_checkout_session_id  text unique,        -- prevents duplicate grants on replay
  stripe_payment_intent_id    text,
  amount_paid_cents           int,

  -- Expiry (null = no expiry; punch pass = 6 months from purchase)
  expires_at                  timestamptz,

  -- For earned packs: why they were granted
  grant_reason                text,               -- e.g. 'referral', '30_day_streak', 'anniversary_1yr'
  granted_by_admin_id         uuid references member(id),

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Trigger: auto-update updated_at
create or replace function set_coaching_pack_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger coaching_session_pack_updated_at
  before update on coaching_session_pack
  for each row execute procedure set_coaching_pack_updated_at();

-- Indexes
create index coaching_session_pack_member_id_idx
  on coaching_session_pack (member_id);

create index coaching_session_pack_active_idx
  on coaching_session_pack (member_id, sessions_remaining, expires_at)
  where sessions_remaining > 0;

-- ── coaching_session_log ──────────────────────────────────────────────────────

create table coaching_session_log (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references member(id) on delete cascade,
  pack_id               uuid references coaching_session_pack(id) on delete set null,

  status                coaching_session_status not null default 'scheduled',

  -- Calendly identifiers (used for deduplication and cancel matching)
  calendly_event_uri    text unique,
  calendly_invitee_uri  text unique,

  -- Session metadata from Calendly payload
  scheduled_at          timestamptz,    -- when the session is booked to happen
  coach_name            text,
  coach_email           text,
  invitee_name          text,
  invitee_email         text,
  event_type_name       text,           -- Calendly event type name (e.g. "60-min Coaching")
  calendly_join_url     text,

  -- Admin notes
  admin_note            text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create or replace function set_coaching_log_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger coaching_session_log_updated_at
  before update on coaching_session_log
  for each row execute procedure set_coaching_log_updated_at();

create index coaching_session_log_member_id_idx
  on coaching_session_log (member_id);

create index coaching_session_log_pack_id_idx
  on coaching_session_log (pack_id);

create index coaching_session_log_calendly_invitee_uri_idx
  on coaching_session_log (calendly_invitee_uri);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table coaching_session_pack enable row level security;
alter table coaching_session_log  enable row level security;

-- Members can read their own packs
create policy "member: read own packs"
  on coaching_session_pack for select
  using (auth.uid() = member_id);

-- Members can read their own session logs
create policy "member: read own session logs"
  on coaching_session_log for select
  using (auth.uid() = member_id);

-- Service role (webhooks, admin) has unrestricted access via bypass_rls
-- No explicit service-role policies needed — admin client bypasses RLS.

-- ── Comments ──────────────────────────────────────────────────────────────────

comment on table coaching_session_pack is
  'Purchased or granted coaching session packs. sessions_remaining decrements on each Calendly booking.';

comment on table coaching_session_log is
  'One row per Calendly booking event. Linked to the pack from which the session was deducted.';

comment on column coaching_session_pack.expires_at is
  'NULL = no expiry (single sessions, earned packs). Punch pass = created_at + 6 months.';

comment on column coaching_session_pack.grant_reason is
  'For earned packs: referral | 30_day_streak | anniversary_1yr | admin_grant';

comment on column coaching_session_log.status is
  'unmatched = Calendly booking but no eligible pack was found. Admin alert required.';
