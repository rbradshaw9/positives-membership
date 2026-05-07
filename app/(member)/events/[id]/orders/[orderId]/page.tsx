import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEvent } from "@/lib/queries/get-events";
import { currentTimestampMs, formatEventDateRange } from "@/lib/events/dates";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { EventStatusBadges, EventVisual, eventLocationLabel } from "@/components/events/MemberEventCard";

type Params = Promise<{ id: string; orderId: string }>;
type SearchParams = Promise<{ ticket?: string; session_id?: string }>;

type OrderRow = {
  id: string;
  event_id: string;
  status: string;
  currency: string;
  total_cents: number;
  quantity: number;
  created_at: string;
  paid_at: string | null;
};

type OrderItemRow = {
  id: string;
  ticket_type_name: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
  currency: string;
};

type TicketRow = {
  id: string;
  ticket_type_id: string | null;
  status: string;
  guest_name: string | null;
  guest_email: string | null;
  ticket_code: string;
};

type AttendeeRow = {
  ticket_id: string | null;
  attendee_number: string;
  security_code: string;
  name: string | null;
  email: string | null;
  status: string;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function orderStatusCopy(status: string) {
  if (status === "paid" || status === "comp") return "Your ticket order is confirmed.";
  if (status === "pending") return "Your ticket order is still pending.";
  if (status === "refunded") return "This ticket order has been refunded.";
  if (status === "chargeback") return "This ticket order is no longer active.";
  return "This ticket order is no longer active.";
}

export default async function EventOrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ id, orderId }, query, member] = await Promise.all([
    params,
    searchParams,
    requireActiveMember(),
  ]);

  const event = await getMemberEvent(id, member.subscription_tier, member.id);
  if (!event) notFound();

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: order, error: orderError } = await supabase
    .from("event_ticket_order")
    .select<OrderRow>("id, event_id, status, currency, total_cents, quantity, created_at, paid_at")
    .eq("id", orderId)
    .eq("event_id", id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (orderError || !order) notFound();

  const [itemsResult, ticketsResult, attendeesResult] = await Promise.all([
    supabase
      .from("event_ticket_order_item")
      .select<OrderItemRow>("id, ticket_type_name, quantity, unit_amount_cents, total_amount_cents, currency")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("event_ticket")
      .select<TicketRow>("id, ticket_type_id, status, guest_name, guest_email, ticket_code")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("event_attendee")
      .select<AttendeeRow>("ticket_id, attendee_number, security_code, name, email, status")
      .eq("order_id", order.id),
  ]);

  const items = (itemsResult.data ?? []) as unknown as OrderItemRow[];
  const tickets = (ticketsResult.data ?? []) as unknown as TicketRow[];
  const attendeesByTicketId = new Map(
    ((attendeesResult.data ?? []) as unknown as AttendeeRow[]).flatMap((attendee) =>
      attendee.ticket_id ? [[attendee.ticket_id, attendee] as const] : []
    )
  );
  const nowMs = currentTimestampMs();
  const confirmed = order.status === "paid" || order.status === "comp";

  return (
    <div className="member-container py-8 md:py-12">
      <Link href={`/events/${event.id}`} className="mb-6 inline-flex text-sm font-semibold text-primary hover:underline">
        Back to Event
      </Link>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <main className="space-y-6">
          <SurfaceCard padding="lg" elevated>
            <p className="ui-section-eyebrow mb-3">Order {order.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="heading-balance font-heading text-4xl font-bold leading-heading tracking-normal text-foreground md:text-5xl">
              {confirmed ? "Tickets Confirmed" : "Ticket Order"}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {query.ticket === "success" ? "Payment succeeded. " : ""}
              {orderStatusCopy(order.status)}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button href={`/events/${event.id}/calendar`} className="justify-center">
                Add to Calendar
              </Button>
              <Button href={`/events/${event.id}`} variant="secondary" className="justify-center">
                View Event
              </Button>
              <Button href="/events" variant="outline" className="justify-center">
                Browse More Events
              </Button>
            </div>
          </SurfaceCard>

          <SurfaceCard padding="lg">
            <h2 className="heading-balance font-heading text-2xl font-semibold tracking-normal text-foreground">
              Tickets
            </h2>
            <div className="mt-4 grid gap-3">
              {tickets.map((ticket, index) => {
                const attendee = attendeesByTicketId.get(ticket.id);
                return (
                  <div key={ticket.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Ticket {index + 1}
                        </p>
                        <h3 className="mt-1 font-heading text-lg font-semibold text-foreground">
                          {attendee?.name || ticket.guest_name || member.name || "Member ticket"}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {attendee?.email || ticket.guest_email || member.email || "No email on ticket"}
                        </p>
                      </div>
                      <span className="admin-badge admin-badge--published self-start">
                        {attendee?.status ?? ticket.status}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="font-semibold text-foreground">Attendee No.</dt>
                        <dd className="mt-1 text-muted-foreground">{attendee?.attendee_number ?? "Pending"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-foreground">Security Code</dt>
                        <dd className="mt-1 text-muted-foreground">{attendee?.security_code ?? ticket.ticket_code}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-foreground">Ticket Code</dt>
                        <dd className="mt-1 break-all text-muted-foreground">{ticket.ticket_code}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>

          <SurfaceCard padding="lg">
            <h2 className="heading-balance font-heading text-2xl font-semibold tracking-normal text-foreground">
              Order Summary
            </h2>
            <div className="mt-4 divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{item.ticket_type_name}</p>
                    <p className="mt-1 text-muted-foreground">
                      {item.quantity} x {money(item.unit_amount_cents, item.currency)}
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">{money(item.total_amount_cents, item.currency)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 pt-4">
                <p className="font-semibold text-foreground">Total</p>
                <p className="font-heading text-xl font-semibold text-foreground">
                  {money(order.total_cents, order.currency)}
                </p>
              </div>
            </div>
          </SurfaceCard>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <EventVisual event={event} className="rounded-[1.25rem]" />
          <SurfaceCard padding="lg" elevated>
            <p className="ui-section-eyebrow mb-3">Event</p>
            <h2 className="heading-balance font-heading text-2xl font-semibold tracking-normal text-foreground">
              {event.title}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-foreground/85">
              {formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{eventLocationLabel(event)}</p>
            <EventStatusBadges event={event} nowMs={nowMs} className="mt-4" />
          </SurfaceCard>
          <SurfaceCard padding="lg">
            <p className="ui-section-eyebrow mb-3">Support</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Confirmation details are saved to your Positives account. For ticket changes or refund questions, contact support.
            </p>
            <Button href="/support" variant="outline" size="sm" className="mt-4 w-full justify-center">
              Support
            </Button>
          </SurfaceCard>
        </aside>
      </div>
    </div>
  );
}
