# Retired LiveKit Event Runbook

LiveKit is retired from active Positives product flows as of the Zoom-first events and coaching pass.

## Current Decision

- Zoom is the active video provider for member events, webinars, group coaching, and 1:1 coaching sessions.
- New or edited events should use `member_event.virtual_mode = 'zoom'` with an attached `event_zoom_meeting` row.
- Native coaching bookings should store their Zoom details on `coaching_booking.zoom_*` fields.
- Existing LiveKit database tables and columns remain in place only for historical compatibility.

## Retired Surfaces

These routes/components are no longer part of the product path:

- `/events/{eventId}/live`
- `/admin/events/{eventId}/studio`
- `/api/events/{eventId}/livekit-token`
- `/api/admin/events/{eventId}/livekit-token`
- `/api/admin/events/{eventId}/livekit-status`
- `/api/webhooks/livekit`

## Zoom Operating Checklist

1. Configure the Zoom OAuth app env vars:
   - `ZOOM_CLIENT_ID`
   - `ZOOM_CLIENT_SECRET`
   - `ZOOM_REDIRECT_URI`
   - `ZOOM_TOKEN_ENCRYPTION_KEY`
   - `ZOOM_WEBHOOK_SECRET_TOKEN`
2. Configure the Zoom OAuth app scopes:
   - `user:read:user`
   - `meeting:read:list_meetings`
   - `meeting:write:meeting`
   - `meeting:update:meeting`
   - `meeting:delete:meeting`
   - `webinar:read:list_webinars`
   - `webinar:write:webinar`
   - `webinar:update:webinar`
   - `webinar:delete:webinar`
3. Connect at least one platform Zoom account at `/admin/integrations/zoom`.
4. Run the Zoom smoke test. It must pass user lookup plus meeting and webinar create/update/delete before treating the account as production-ready.
5. For coach-owned Zoom rooms, connect that coach's Zoom account or set `coach_profile.zoom_connection_id` to a platform/shared Zoom account.
6. Create or edit events with Zoom selected, then create or attach a Zoom meeting/webinar before publishing.
7. Book, reschedule, and cancel a test coaching session, confirming `coaching_booking.zoom_join_url` and `zoom_meeting_id` are populated and Zoom reflects the time/cancel change.
8. Confirm member and coach confirmation/reminder emails contain the Zoom join URL.

## Historical Notes

The `event_livekit_room`, `livekit_webhook_event`, `coaching_booking.livekit_room_name`, and related migration history should not be dropped in this pass. Remove them only in a future cleanup after production data has been audited.
