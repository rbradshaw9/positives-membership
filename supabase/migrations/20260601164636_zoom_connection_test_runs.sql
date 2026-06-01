-- Persistent evidence for Zoom account smoke tests.

create table if not exists public.zoom_connection_test_run (
  id uuid primary key default gen_random_uuid(),
  zoom_connection_id uuid not null references public.zoom_connection(id) on delete cascade,
  initiated_by uuid references auth.users(id) on delete set null,
  status text not null default 'running' check (status in ('running', 'passed', 'failed')),
  checks jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_zoom_connection_test_run_connection_started
  on public.zoom_connection_test_run(zoom_connection_id, started_at desc);

alter table public.zoom_connection_test_run enable row level security;

comment on table public.zoom_connection_test_run is
  'Audit trail for live Zoom smoke tests against connected accounts.';

comment on column public.zoom_connection_test_run.checks is
  'Structured result for user lookup, meeting create/delete, and webinar create/delete smoke checks.';
