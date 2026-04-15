-- Smartlead campaigns cache
create table if not exists smartlead_campaigns (
  id uuid primary key default gen_random_uuid(),
  smartlead_campaign_id bigint not null unique,
  source_owner source_owner not null default 'tcfa',
  name text not null,
  status text not null,
  settings jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  webhook_registered boolean not null default false,
  synced_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Smartlead email accounts cache
create table if not exists smartlead_email_accounts (
  id uuid primary key default gen_random_uuid(),
  smartlead_account_id bigint not null unique,
  email text not null,
  provider text,
  warmup_enabled boolean,
  warmup_reputation numeric,
  daily_limit integer,
  status text not null default 'active',
  stats jsonb not null default '{}'::jsonb,
  synced_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- MailWizz campaigns cache
create table if not exists mailwizz_campaigns (
  id uuid primary key default gen_random_uuid(),
  mailwizz_campaign_uid text not null unique,
  source_owner source_owner not null,
  name text not null,
  list_uid text not null,
  status text not null,
  type text,
  stats jsonb not null default '{}'::jsonb,
  synced_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Indexes
create index if not exists smartlead_campaigns_status_idx
  on smartlead_campaigns (status);

create index if not exists smartlead_email_accounts_status_idx
  on smartlead_email_accounts (status);

create index if not exists mailwizz_campaigns_source_owner_idx
  on mailwizz_campaigns (source_owner);

-- Auto-update trigger for smartlead_campaigns
drop trigger if exists smartlead_campaigns_touch_updated_at on smartlead_campaigns;
create trigger smartlead_campaigns_touch_updated_at
before update on smartlead_campaigns
for each row execute function touch_updated_at();

-- Add the missing routing_actions index from Phase 8
create index if not exists routing_actions_status_created_at_idx
  on routing_actions (status, created_at desc);
;
