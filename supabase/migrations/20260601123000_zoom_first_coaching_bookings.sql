-- Zoom-first coaching booking metadata.
-- Keeps existing LiveKit columns for historical compatibility while making Zoom
-- the active session provider for native coaching bookings.

alter table public.coaching_booking
  add column if not exists zoom_connection_id uuid references public.zoom_connection(id) on delete set null,
  add column if not exists zoom_start_url_ciphertext text,
  add column if not exists zoom_host_email text,
  add column if not exists zoom_provider_status text,
  add column if not exists zoom_raw_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_coaching_booking_zoom_connection
  on public.coaching_booking(zoom_connection_id);

comment on column public.coaching_booking.zoom_connection_id is
  'Zoom connection used to create or manage the attached coaching meeting.';

comment on column public.coaching_booking.zoom_join_url is
  'Zoom join URL for the member and coach. This is the active coaching session link.';

comment on column public.coaching_booking.zoom_start_url_ciphertext is
  'Encrypted Zoom host start URL. Never expose to members.';

comment on column public.coaching_booking.zoom_raw_metadata is
  'Raw Zoom meeting creation response for support and reconciliation.';
