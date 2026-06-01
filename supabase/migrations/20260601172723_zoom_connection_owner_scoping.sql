create unique index if not exists zoom_connection_active_owner_user_unique
  on public.zoom_connection (
    owner_kind,
    coalesce(owner_member_id, '00000000-0000-0000-0000-000000000000'::uuid),
    zoom_user_id
  )
  where status in ('active', 'needs_reconnect')
    and zoom_user_id is not null;

comment on index public.zoom_connection_active_owner_user_unique is
  'Prevents duplicate active/reconnect rows for the same Zoom user under the same platform or coach owner while preserving disabled history.';
