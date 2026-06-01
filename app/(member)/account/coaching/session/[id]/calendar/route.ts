import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { buildEventIcs } from "@/lib/events/ics";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const user = await getSession();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: raw } = await supabase
    .from("coaching_booking")
    .select(
      "id, member_id, scheduled_at, duration_minutes, zoom_join_url, member:member(name, email), coach:coach_profile(member_id, display_name)"
    )
    .eq("id", id)
    .single();

  type BookingRow = {
    id: string;
    member_id: string;
    scheduled_at: string;
    duration_minutes: number;
    zoom_join_url: string | null;
    member: { name: string | null; email: string } | Array<{ name: string | null; email: string }> | null;
    coach: { member_id: string | null; display_name: string } | Array<{ member_id: string | null; display_name: string }> | null;
  };
  const booking = raw as BookingRow | null;
  if (!booking) return new NextResponse("Not found", { status: 404 });

  const coach = Array.isArray(booking.coach) ? booking.coach[0] : booking.coach;
  const member = Array.isArray(booking.member) ? booking.member[0] : booking.member;
  const canRead = booking.member_id === user.id || coach?.member_id === user.id;
  if (!canRead) return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const startsAt = new Date(booking.scheduled_at);
  const endsAt = new Date(startsAt.getTime() + booking.duration_minutes * 60 * 1000);
  const sessionUrl = `${url.origin}/account/coaching/session/${booking.id}`;
  const joinUrl = booking.zoom_join_url ?? sessionUrl;
  const ics = buildEventIcs({
    id: `coaching-${booking.id}`,
    title: `Coaching Session with ${coach?.display_name ?? "your coach"}`,
    description: [
      `Join Zoom session: ${joinUrl}`,
      `Booking details: ${sessionUrl}`,
      member?.name || member?.email ? `Member: ${member.name ?? member.email}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    location: "Zoom",
    url: joinUrl,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="positives-coaching-${booking.id}.ics"`,
    },
  });
}
