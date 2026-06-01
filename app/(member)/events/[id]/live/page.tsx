import Link from "next/link";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEvent } from "@/lib/queries/get-events";
import { currentTimestampMs, formatEventDateRange } from "@/lib/events/dates";
import { generateLiveKitEventToken, liveKitPublicUrl } from "@/lib/livekit/events";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { LiveKitEventRoom } from "@/components/events/LiveKitEventRoom";
import { MemberUnavailableState } from "@/components/member/MemberUnavailableState";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Live event — Positives",
};

export default async function MemberLiveEventPage({ params }: { params: Params }) {
  const member = await requireActiveMember();
  const { id } = await params;
  const event = await getMemberEvent(id, member.subscription_tier, member.id);
  if (!event) {
    return (
      <MemberUnavailableState
        eyebrow="Live room unavailable"
        title="This live event room is not available."
        subtitle="The event may not be included with your membership, or it may have been hidden while details are being finalized. Return to Events to see what is available now."
        primaryHref="/events"
        primaryLabel="Back to Events"
        secondaryHref="/account"
        secondaryLabel="View account"
      />
    );
  }

  if (event.virtual_mode !== "livekit" || !event.event_livekit_room?.room_name) {
    return (
      <MemberUnavailableState
        eyebrow="Live room unavailable"
        title="This event does not have a live room."
        subtitle="Some events use another online link, an in-person location, or replay-only access. Return to the event details for the right next step."
        primaryHref={`/events/${event.id}`}
        primaryLabel="Back to event"
        secondaryHref="/events"
        secondaryLabel="All Events"
      />
    );
  }

  const now = currentTimestampMs();
  const startsAt = new Date(event.starts_at).getTime();
  const endsAt = new Date(event.ends_at).getTime();
  const roomOpen = now >= startsAt - 60 * 60 * 1000 && now <= endsAt + 30 * 60 * 1000;
  const serverUrl = roomOpen ? liveKitPublicUrl() : null;
  const initialTokenResponse = serverUrl
    ? {
        token: await generateLiveKitEventToken({
          roomName: event.event_livekit_room.room_name,
          identity: `audience-${member.id}`,
          name: member.name ?? member.email ?? "Member",
          role: "audience",
          eventId: event.id,
        }),
        serverUrl,
        roomName: event.event_livekit_room.room_name,
      }
    : null;

  return (
    <div className="member-container py-8 pb-28 md:py-12">
      <Link href={`/events/${event.id}`} className="mb-6 inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground">
        Back to event
      </Link>

      <div className="mb-5">
        <p className="ui-section-eyebrow mb-2">Live event</p>
        <h1 className="heading-balance font-heading text-4xl font-bold tracking-normal text-foreground">
          {event.title}
        </h1>
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          {formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}
        </p>
      </div>

      {roomOpen ? (
        <LiveKitEventRoom
          eventId={event.id}
          title={event.title}
          role="audience"
          startsAt={event.starts_at}
          endsAt={event.ends_at}
          initialTokenResponse={initialTokenResponse}
        />
      ) : (
        <SurfaceCard padding="lg">
          <p className="font-heading text-2xl font-semibold text-foreground">The live room is closed.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Join opens one hour before the event. After the event, the replay will appear on the event page when it is ready.
          </p>
        </SurfaceCard>
      )}
    </div>
  );
}
