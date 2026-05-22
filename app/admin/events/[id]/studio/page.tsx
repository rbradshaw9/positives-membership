import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminEvent } from "@/lib/queries/get-events";
import { formatEventDateRange } from "@/lib/events/dates";
import { generateLiveKitEventToken, liveKitPublicUrl } from "@/lib/livekit/events";
import { createLiveKitStudioToken } from "@/lib/livekit/studio-auth";
import { LiveKitEventRoom } from "@/components/events/LiveKitEventRoom";
import { LiveKitEventStatusCards } from "@/components/events/LiveKitEventStatusCards";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Event Studio - Positives Admin",
};

export default async function AdminEventStudioPage({ params }: { params: Params }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const event = await getAdminEvent(id);
  if (!event) notFound();
  if (event.virtual_mode !== "livekit" || !event.event_livekit_room?.room_name) {
    notFound();
  }

  const room = event.event_livekit_room;
  const studioAuthToken = createLiveKitStudioToken({
    eventId: event.id,
    userId: admin.id,
  });
  const serverUrl = liveKitPublicUrl();
  const initialTokenResponse = serverUrl
    ? {
        token: await generateLiveKitEventToken({
          roomName: room.room_name,
          identity: `host-${admin.id}`,
          name: admin.email ?? "Host",
          role: "host",
          eventId: event.id,
        }),
        serverUrl,
        roomName: room.room_name,
      }
    : null;

  return (
    <div className="admin-page-content" style={{ maxWidth: "86rem" }}>
      <div className="admin-page-header admin-page-header--split">
        <div>
          <p className="admin-page-header__eyebrow">LiveKit Studio</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>{event.title}</h1>
          <p className="admin-page-header__subtitle">
            {formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}
          </p>
        </div>
        <div className="admin-page-header__actions">
          <Link href={`/events/${event.id}/live`} className="admin-btn admin-btn--outline" target="_blank">
            Member view
          </Link>
          <Link href={`/admin/events/${event.id}/edit`} className="admin-btn admin-btn--ghost">
            Edit event
          </Link>
        </div>
      </div>

      <LiveKitEventStatusCards
        eventId={event.id}
        authToken={studioAuthToken}
        initialStatus={{
          roomName: room.room_name,
          roomStatus: room.room_status,
          recordingPolicy: room.recording_policy,
          egressId: room.egress_id,
          egressStatus: room.egress_status,
          replayAttached: Boolean(event.replay_asset_id || room.replay_asset_id),
          replayAssetId: event.replay_asset_id ?? room.replay_asset_id ?? null,
          lastError: room.last_error,
          roomStartedAt: room.room_started_at,
          roomFinishedAt: room.room_finished_at,
          egressStartedAt: room.egress_started_at,
          egressEndedAt: room.egress_ended_at,
        }}
      />

      <section className="admin-form-card mb-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)] lg:items-start">
          <div>
            <p className="admin-page-header__eyebrow">Before you go live</p>
            <h2 className="mt-1 font-heading text-xl font-semibold text-foreground" style={{ textWrap: "balance" }}>
              Keep the member experience simple and steady.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Use this studio for camera, mic, and screen share. Members join the branded event room as viewers only.
            </p>
          </div>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li className="rounded-xl border border-border bg-muted/30 px-3 py-2">Check camera and microphone before the start time.</li>
            <li className="rounded-xl border border-border bg-muted/30 px-3 py-2">Open the member view in another tab to confirm the audience room.</li>
            <li className="rounded-xl border border-border bg-muted/30 px-3 py-2">Keep the Zoom fallback available until replay recording is verified.</li>
          </ul>
        </div>
      </section>

      <LiveKitEventRoom
        eventId={event.id}
        title={event.title}
        role="host"
        startsAt={event.starts_at}
        endsAt={event.ends_at}
        initialTokenResponse={initialTokenResponse}
        authToken={studioAuthToken}
      />
    </div>
  );
}
