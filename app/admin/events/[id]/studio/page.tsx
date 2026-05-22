import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminEvent } from "@/lib/queries/get-events";
import { formatEventDateRange } from "@/lib/events/dates";
import { generateLiveKitEventToken, liveKitPublicUrl } from "@/lib/livekit/events";
import { LiveKitEventRoom } from "@/components/events/LiveKitEventRoom";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Event Studio - Positives Admin",
};

function statusText(status?: string | null) {
  if (!status) return "Pending";
  if (status === "complete") return "Replay ready";
  if (status === "failed") return "Recording failed";
  if (status === "active" || status === "starting") return "Recording";
  return status;
}

export default async function AdminEventStudioPage({ params }: { params: Params }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const event = await getAdminEvent(id);
  if (!event) notFound();
  if (event.virtual_mode !== "livekit" || !event.event_livekit_room?.room_name) {
    notFound();
  }

  const room = event.event_livekit_room;
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

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="admin-events-summary-card">
          <span>Room</span>
          <strong>{room.room_status}</strong>
        </div>
        <div className="admin-events-summary-card">
          <span>Recording</span>
          <strong>{statusText(room.egress_status)}</strong>
        </div>
        <div className="admin-events-summary-card">
          <span>Replay</span>
          <strong>{event.replay_asset_id ? "Attached" : "Waiting"}</strong>
        </div>
        <div className="admin-events-summary-card">
          <span>Room name</span>
          <strong className="break-all text-base">{room.room_name}</strong>
        </div>
      </div>

      {room.last_error ? (
        <div className="admin-banner admin-banner--error mb-5">
          {room.last_error}
        </div>
      ) : null}

      <LiveKitEventRoom
        eventId={event.id}
        title={event.title}
        role="host"
        startsAt={event.starts_at}
        endsAt={event.ends_at}
        initialTokenResponse={initialTokenResponse}
      />
    </div>
  );
}
