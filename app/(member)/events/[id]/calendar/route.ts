import { NextResponse } from "next/server";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEvent } from "@/lib/queries/get-events";
import { buildEventIcs } from "@/lib/events/ics";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const member = await requireActiveMember();
  const { id } = await params;
  const event = await getMemberEvent(id, member.subscription_tier, member.id);
  if (!event) return new NextResponse("Not found", { status: 404 });

  const url = new URL(request.url);
  const ics = buildEventIcs({
    id: event.id,
    title: event.title,
    description: event.excerpt ?? event.description,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    location: event.event_venue?.name ?? undefined,
    url: `${url.origin}/events/${event.id}`,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="positives-event-${event.id}.ics"`,
    },
  });
}
