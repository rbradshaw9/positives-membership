
-- Support form submissions table
-- Stores contact form submissions from /support page
-- RLS is enabled but only service role can insert (no member auth required on marketing pages)

create table if not exists public.support_submissions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  subject     text not null default 'general',
  message     text not null,
  member_id   uuid references public.member(id) on delete set null
);

-- No public insert — submissions go through a server action using service role
alter table public.support_submissions enable row level security;

-- Only service role can read/write (no public policies needed)
comment on table public.support_submissions is 'Contact form submissions from the /support marketing page.';
;
