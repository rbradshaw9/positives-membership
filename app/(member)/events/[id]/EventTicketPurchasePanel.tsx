import { purchaseEventTickets } from "./actions";
import type { EventRow } from "@/lib/queries/get-events";
import { currentTimestampMs, formatEventDateRange } from "@/lib/events/dates";
import { accessLevelLabel } from "@/lib/events/types";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function ticketAccessText(ticket: NonNullable<EventRow["event_ticket_type"]>[number]) {
  const access = ticket.event_ticket_type_access_level ?? [];
  if (access.length === 0) return "Available to selected event levels";
  return access.map((row) => accessLevelLabel(row.subscription_tier)).join(", ");
}

function saleWindowText(ticket: NonNullable<EventRow["event_ticket_type"]>[number], event: EventRow) {
  if (ticket.sale_starts_at && ticket.sale_ends_at) {
    return `Sales run ${formatEventDateRange(ticket.sale_starts_at, ticket.sale_ends_at, event.timezone, false)}.`;
  }
  if (ticket.sale_starts_at) {
    return `Sales open ${formatEventDateRange(ticket.sale_starts_at, ticket.sale_starts_at, event.timezone, false)}.`;
  }
  if (ticket.sale_ends_at) {
    return `Sales end ${formatEventDateRange(ticket.sale_ends_at, ticket.sale_ends_at, event.timezone, false)}.`;
  }
  return `Sales close when the event begins.`;
}

function ticketAvailability(ticket: NonNullable<EventRow["event_ticket_type"]>[number], event: EventRow, nowMs: number) {
  const sold = ticket.sold_count ?? 0;
  const held = ticket.held_count ?? 0;
  const remaining = ticket.capacity === null || ticket.capacity === undefined
    ? null
    : Math.max(0, ticket.capacity - sold - held);
  const opensAt = ticket.sale_starts_at ? new Date(ticket.sale_starts_at).getTime() : null;
  const closesAt = new Date(ticket.sale_ends_at ?? event.starts_at).getTime();
  const eventEnded = new Date(event.starts_at).getTime() <= nowMs;
  const notOpen = opensAt !== null && opensAt > nowMs;
  const closed = closesAt <= nowMs;
  const soldOut = remaining !== null && remaining <= 0;
  const disabled = event.status === "canceled" || eventEnded || notOpen || closed || soldOut;
  let label = remaining === null ? "Unlimited availability" : `${remaining} available`;
  let tone = "text-muted-foreground";
  if (event.status === "canceled") {
    label = "Event canceled";
    tone = "text-destructive";
  } else if (eventEnded) {
    label = "This event has passed";
  } else if (notOpen) {
    label = "Tickets are not yet available";
  } else if (closed) {
    label = "Ticket sales have ended";
  } else if (soldOut) {
    label = "Sold out";
    tone = "text-destructive";
  } else if (remaining !== null && remaining <= 5) {
    label = `Only ${remaining} left`;
    tone = "text-amber-700";
  }
  return { disabled, label, tone, remaining };
}

export function EventTicketPurchasePanel({
  event,
  ticketError,
}: {
  event: EventRow;
  ticketError?: string;
}) {
  const tickets = (event.event_ticket_type ?? []).filter((ticket) => ticket.status === "active");
  if (tickets.length === 0) {
    return (
      <SurfaceCard padding="lg">
        <p className="ui-section-eyebrow mb-2">Tickets</p>
        <p className="text-sm text-muted-foreground">
          Tickets are required for this event, but sales are not open yet.
        </p>
      </SurfaceCard>
    );
  }

  const errorCopy =
    ticketError === "quantity_required"
      ? "Choose at least one ticket."
      : ticketError
        ? "Ticket checkout could not be started. Please try again."
      : null;
  const nowMs = currentTimestampMs();
  const ticketStates = new Map(
    tickets.map((ticket) => [ticket.id, ticketAvailability(ticket, event, nowMs)])
  );
  const allUnavailable = tickets.every((ticket) => ticketStates.get(ticket.id)?.disabled);

  return (
    <SurfaceCard padding="lg" elevated>
      <form action={purchaseEventTickets} className="space-y-5">
        <input type="hidden" name="event_id" value={event.id} />
        <div>
          <p className="ui-section-eyebrow mb-2">Tickets</p>
          <h2 className="heading-balance font-heading text-xl font-semibold text-foreground">
            Reserve your seat
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This event is visible with your membership, and a ticket is required for the live link and replay access.
          </p>
        </div>

        {errorCopy ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorCopy}
          </div>
        ) : null}

        <div className="space-y-3">
          {tickets.map((ticket) => {
            const state = ticketStates.get(ticket.id) ?? ticketAvailability(ticket, event, nowMs);
            const maxQuantity = Math.min(ticket.max_per_order, state.remaining ?? ticket.max_per_order);
            return (
              <div key={ticket.id} className="rounded-xl border border-border bg-background p-4">
                <input type="hidden" name="ticket_type_id" value={ticket.id} />
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-base font-semibold text-foreground">
                        {ticket.name}
                      </h3>
                      {state.disabled ? (
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {state.label}
                        </span>
                      ) : null}
                    </div>
                    {ticket.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
                    ) : null}
                    <div className="mt-2 grid gap-1 text-xs font-medium text-muted-foreground">
                      <span>{ticketAccessText(ticket)}</span>
                      <span>{saleWindowText(ticket, event)}</span>
                      <span className={state.tone}>{state.label}</span>
                    </div>
                  </div>
                  <div className="grid gap-2 md:min-w-36">
                    <span className="font-heading text-lg font-semibold text-foreground md:text-right">
                      {formatMoney(ticket.price_cents, ticket.currency)}
                    </span>
                    <label className="grid gap-1 text-sm font-medium text-foreground">
                      Quantity
                      <input
                        name={`quantity_${ticket.id}`}
                        type="number"
                        min="0"
                        max={maxQuantity}
                        defaultValue="0"
                        disabled={state.disabled}
                        className="admin-input disabled:cursor-not-allowed disabled:opacity-55"
                      />
                    </label>
                  </div>
                </div>
                <label className="mt-3 grid gap-1 text-sm font-medium text-foreground">
                  Guest names/emails
                  <textarea
                    name={`guests_${ticket.id}`}
                    rows={2}
                    disabled={state.disabled}
                    className="admin-textarea disabled:cursor-not-allowed disabled:opacity-55"
                    placeholder="Optional. One guest per line, such as Jane Doe <jane@example.com>."
                  />
                </label>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sales close when the event begins unless an admin closes them earlier.
          </p>
          <Button type="submit" disabled={allUnavailable} className="w-full sm:w-auto">
            Continue to purchase
          </Button>
        </div>
      </form>
    </SurfaceCard>
  );
}
