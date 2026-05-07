import { purchaseEventTickets } from "./actions";
import type { EventRow } from "@/lib/queries/get-events";
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
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-xl border border-border bg-background p-4">
              <input type="hidden" name="ticket_type_id" value={ticket.id} />
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {ticket.name}
                  </h3>
                  {ticket.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    {ticketAccessText(ticket)}
                  </p>
                </div>
                <div className="grid gap-2 md:min-w-36">
                  <span className="text-right font-heading text-lg font-semibold text-foreground md:text-left">
                    {formatMoney(ticket.price_cents, ticket.currency)}
                  </span>
                  <label className="grid gap-1 text-sm font-medium text-foreground">
                    Quantity
                    <input
                      name={`quantity_${ticket.id}`}
                      type="number"
                      min="0"
                      max={ticket.max_per_order}
                      defaultValue="0"
                      className="admin-input"
                    />
                  </label>
                </div>
              </div>
              <label className="mt-3 grid gap-1 text-sm font-medium text-foreground">
                Guest names/emails
                <textarea
                  name={`guests_${ticket.id}`}
                  rows={2}
                  className="admin-textarea"
                  placeholder="Optional. One guest per line, such as Jane Doe <jane@example.com>."
                />
              </label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sales close when the event begins unless an admin closes them earlier.
          </p>
          <Button type="submit">
            Continue to purchase
          </Button>
        </div>
      </form>
    </SurfaceCard>
  );
}
