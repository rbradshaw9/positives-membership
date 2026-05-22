# LiveKit Event Runbook

LiveKit events are the target path for Positives webinars. Zoom stays available as the fallback until one real LiveKit event has completed with recording and replay verified.

## Current Shape

- Event source of truth: `member_event`.
- Live event mode: `member_event.virtual_mode = 'livekit'`.
- Room tracking: `event_livekit_room`.
- Webhook log: `livekit_webhook_event`.
- Member join route: `/events/{eventId}/live`.
- Host studio route: `/admin/events/{eventId}/studio`.
- Member token route: `/api/events/{eventId}/livekit-token`.
- Host token route: `/api/admin/events/{eventId}/livekit-token`.
- Webhook route: `/api/webhooks/livekit`.
- Replay playback route: `/api/media/assets/{assetId}` with HTTP Range support.

## Required Infrastructure

LiveKit events require two separate health checks:

1. Room service: can create/list rooms and issue tokens.
2. Egress service: can list/start recordings.

The admin ops page checks both. A LiveKit event with automatic recording should not be published until Room service and Egress service both report healthy.

For self-hosted LiveKit, Egress must be deployed with Redis access to the same LiveKit Redis. If ops shows `egress not connected (redis required)`, room joins may work but automatic replay recording will not.

Fixed on May 22, 2026:

- Room service: healthy.
- Redis added to the Hetzner LiveKit host and configured in `livekit.yaml`.
- `livekit/egress` added to `/opt/livekit/docker-compose.yml` with `SYS_ADMIN`, host networking, and `/opt/livekit/egress.yaml`.
- Egress service: healthy via LiveKit SDK `ListEgress`.
- Hetzner server resized from `cpx21` to `cpx31` so Egress has 4 vCPU / 8 GB RAM.
- Docker Compose v2 installed and LiveKit UDP socket buffers raised to 5 MB via `/etc/sysctl.d/99-livekit.conf`.

## First Migrated Event Checklist

1. Confirm LiveKit env vars are present in Vercel production:
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `NEXT_PUBLIC_LIVEKIT_URL`
2. Confirm replay storage env vars are present:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `S3_MEDIA_BUCKET`
   - `S3_MEDIA_REGION`
3. Open `/admin/ops` and confirm Room service and Egress service are both healthy.
4. Create or edit one test event and choose `LiveKit webinar`.
5. Publish the event only after the LiveKit readiness check passes.
6. Open `/admin/events/{eventId}/studio` as an admin and confirm camera, mic, and screen-share controls are visible.
7. Open `/events/{eventId}/live` as an eligible member inside the one-hour join window and confirm the member cannot publish camera or mic.
8. Start the event from the host studio and confirm the audience sees host media.
9. Confirm `event_livekit_room.egress_status` moves through `started` or `active` and then `complete`.
10. After the event ends, confirm `member_event.replay_asset_id` is populated and the event page plays the replay.

## Webhook Expectations

Configure the LiveKit webhook endpoint to:

```text
https://positives.life/api/webhooks/livekit
```

The route verifies the LiveKit signature, records each webhook event idempotently, and updates `event_livekit_room`.

Expected events for the first pass:

- `room_started`
- `room_finished`
- `participant_joined`
- `participant_left`
- `participant_connection_aborted`
- `egress_started`
- `egress_updated`
- `egress_ended`

## Replay Recovery

If recording fails:

1. Check `/admin/ops` for Egress health.
2. Check `event_livekit_room.last_error` for the latest failure.
3. Confirm the Egress service can reach Redis and the S3 bucket.
4. Confirm the S3 replay key pattern:

```text
event-replays/{eventId}/recording.mp4
```

5. If an MP4 exists in S3 but the event has no replay, create a `media_asset` row for the object and attach it to `member_event.replay_asset_id`.

## Zoom Fallback

Keep the Zoom URL on migrated events until one real LiveKit event has passed with replay verified.

If LiveKit room or Egress health fails before a live event:

1. Leave the event published.
2. Use the existing Zoom join URL as the member-facing fallback.
3. Add an admin note to the event with the LiveKit failure and fallback decision.
4. Do not bulk-migrate remaining Zoom events until the failure is resolved.

## Known Follow-Ups

- Run one real LiveKit event recording smoke test before the first member-facing webinar cutover.
- LiveKit Ingress/OBS is not in v1; hosts use browser camera, mic, and screen share.
- True LiveKit E2EE is not implemented; member-facing copy should say secure video session, not end-to-end encrypted.
