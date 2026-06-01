-- Harden coach default Zoom account mapping now that coaching uses Zoom.

create index if not exists idx_coach_profile_zoom_connection
  on public.coach_profile(zoom_connection_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'coach_profile_zoom_connection_id_fkey'
      and conrelid = 'public.coach_profile'::regclass
  ) then
    alter table public.coach_profile
      add constraint coach_profile_zoom_connection_id_fkey
      foreign key (zoom_connection_id)
      references public.zoom_connection(id)
      on delete set null;
  end if;
end $$;

comment on column public.coach_profile.zoom_connection_id is
  'Default Zoom connection used when creating this coach''s native coaching sessions.';
