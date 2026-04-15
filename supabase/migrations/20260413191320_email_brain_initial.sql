
create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'source_owner') then
    create type source_owner as enum ('tcfa', 'richdad');
  end if;

  if not exists (select 1 from pg_type where typname = 'contact_state') then
    create type contact_state as enum (
      'raw',
      'queued_for_outreach',
      'active_outreach',
      'engaged_low',
      'engaged_medium',
      'engaged_high',
      'marketable',
      'customer_or_converted',
      'suppressed',
      'invalid'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'external_system') then
    create type external_system as enum ('smartlead', 'mailwizz', 'manual');
  end if;

  if not exists (select 1 from pg_type where typname = 'event_type') then
    create type event_type as enum (
      'contact_created',
      'open',
      'repeated_open',
      'click',
      'reply',
      'unsubscribe',
      'hard_bounce',
      'soft_bounce',
      'complaint',
      'suppressed',
      'promoted_to_mailwizz',
      'mailwizz_unsubscribe',
      'manual_promote',
      'manual_suppress',
      'state_changed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'suppression_reason') then
    create type suppression_reason as enum (
      'unsubscribe',
      'hard_bounce',
      'complaint',
      'manual',
      'invalid_email',
      'mailwizz_unsubscribe'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'routing_action_type') then
    create type routing_action_type as enum (
      'hold',
      'flag_smartlead_sequence_move',
      'sync_to_mailwizz',
      'mirror_suppression_to_mailwizz',
      'manual_promote',
      'manual_suppress'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'routing_action_status') then
    create type routing_action_status as enum ('pending', 'completed', 'failed', 'skipped');
  end if;

  if not exists (select 1 from pg_type where typname = 'sync_provider') then
    create type sync_provider as enum ('smartlead', 'mailwizz');
  end if;

  if not exists (select 1 from pg_type where typname = 'sync_job_status') then
    create type sync_job_status as enum ('pending', 'running', 'completed', 'failed');
  end if;
end $$;

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  normalized_email citext not null unique,
  email text not null,
  first_name text,
  last_name text,
  state contact_state not null default 'raw',
  latest_activity_at timestamptz,
  last_positive_signal_at timestamptz,
  marketable_at timestamptz,
  invalidated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists contact_sources (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  source_owner source_owner not null,
  source_label text,
  source_policy_allows_marketing boolean not null default true,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (contact_id, source_owner)
);

create table if not exists contact_identities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  system external_system not null,
  source_owner source_owner,
  external_id text not null,
  email_at_source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (system, external_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  source_owner source_owner,
  system external_system not null,
  event_type event_type not null,
  external_event_id text,
  idempotency_key text not null unique,
  occurred_at timestamptz not null,
  received_at timestamptz not null default timezone('utc'::text, now()),
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists scores (
  contact_id uuid primary key references contacts(id) on delete cascade,
  engagement_score integer not null default 0,
  deliverability_score integer not null default 100,
  marketing_readiness integer not null default 0,
  commercial_intent_score integer,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists suppression_entries (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  source_owner source_owner,
  reason suppression_reason not null,
  is_active boolean not null default true,
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  expires_at timestamptz,
  resolved_at timestamptz
);

create table if not exists routing_actions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  source_owner source_owner,
  action_type routing_action_type not null,
  status routing_action_status not null default 'pending',
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  executed_at timestamptz
);

create table if not exists sync_jobs (
  id uuid primary key default gen_random_uuid(),
  provider sync_provider not null,
  source_owner source_owner,
  scope text not null,
  status sync_job_status not null default 'pending',
  attempt_count integer not null default 0,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists events_contact_id_occurred_at_idx
  on events (contact_id, occurred_at desc);

create index if not exists events_event_type_idx
  on events (event_type);

create index if not exists suppression_entries_contact_id_is_active_idx
  on suppression_entries (contact_id, is_active);

create index if not exists routing_actions_contact_id_created_at_idx
  on routing_actions (contact_id, created_at desc);

create index if not exists sync_jobs_provider_status_idx
  on sync_jobs (provider, status, created_at desc);

-- Additional index for cron routing processor
create index if not exists routing_actions_status_created_at_idx
  on routing_actions (status, created_at asc);

drop trigger if exists contacts_touch_updated_at on contacts;
create trigger contacts_touch_updated_at
before update on contacts
for each row execute function touch_updated_at();

drop trigger if exists contact_sources_touch_updated_at on contact_sources;
create trigger contact_sources_touch_updated_at
before update on contact_sources
for each row execute function touch_updated_at();

drop trigger if exists contact_identities_touch_updated_at on contact_identities;
create trigger contact_identities_touch_updated_at
before update on contact_identities
for each row execute function touch_updated_at();

create or replace view admin_contact_overview as
select
  c.id,
  c.normalized_email,
  c.email,
  c.first_name,
  c.last_name,
  c.state,
  c.latest_activity_at,
  c.last_positive_signal_at,
  c.marketable_at,
  s.engagement_score,
  s.deliverability_score,
  s.marketing_readiness,
  exists (
    select 1
    from suppression_entries se
    where se.contact_id = c.id
      and se.is_active = true
  ) as is_suppressed,
  c.created_at,
  c.updated_at
from contacts c
left join scores s on s.contact_id = c.id;
;
