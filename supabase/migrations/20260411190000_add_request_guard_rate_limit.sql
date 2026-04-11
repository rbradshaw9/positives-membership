create table if not exists public.request_guard_window (
  scope text not null,
  bucket text not null,
  window_started_at timestamptz not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, bucket, window_started_at)
);

create index if not exists request_guard_window_updated_at_idx
  on public.request_guard_window (updated_at desc);

alter table public.request_guard_window enable row level security;

comment on table public.request_guard_window is
  'Stores coarse request-rate buckets for abuse protection on public endpoints.';

create or replace function public.guard_rate_limit(
  p_scope text,
  p_bucket text,
  p_window_seconds integer,
  p_max_hits integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  hit_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_window_seconds integer := greatest(p_window_seconds, 1);
  v_max_hits integer := greatest(p_max_hits, 1);
  v_window_started_at timestamptz;
  v_hit_count integer;
  v_retry_after integer;
begin
  v_window_started_at :=
    to_timestamp(floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds);

  insert into public.request_guard_window (
    scope,
    bucket,
    window_started_at,
    hit_count,
    created_at,
    updated_at
  )
  values (
    p_scope,
    p_bucket,
    v_window_started_at,
    1,
    v_now,
    v_now
  )
  on conflict (scope, bucket, window_started_at)
  do update
    set hit_count = public.request_guard_window.hit_count + 1,
        updated_at = v_now
  returning public.request_guard_window.hit_count into v_hit_count;

  if v_hit_count <= v_max_hits then
    return query
    select true, 0, v_hit_count;
    return;
  end if;

  v_retry_after :=
    greatest(
      1,
      v_window_seconds - floor(extract(epoch from (v_now - v_window_started_at)))::integer
    );

  return query
  select false, v_retry_after, v_hit_count;
end;
$$;

revoke all on function public.guard_rate_limit(text, text, integer, integer) from public;
revoke all on function public.guard_rate_limit(text, text, integer, integer) from anon;
revoke all on function public.guard_rate_limit(text, text, integer, integer) from authenticated;
grant execute on function public.guard_rate_limit(text, text, integer, integer) to service_role;
