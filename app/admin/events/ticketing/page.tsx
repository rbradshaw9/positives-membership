import Link from "next/link";
import { grantEventCompTickets } from "../settings/actions";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export const metadata = {
  title: "Event Ticketing - Positives Admin",
};

type SearchParams = Promise<{ error?: string; success?: string; q?: string; status?: string }>;

type TicketAdminRow = {
  id: string;
  event_id: string;
  name: string;
  price_cents: number;
  currency: string;
  capacity: number | null;
  max_per_order: number;
  status: string;
  member_event?: {
    id: string;
    title: string;
    starts_at: string;
    status: string;
  } | null;
};

type TicketStatsRow = {
  ticket_type_id: string | null;
  status: string;
};

const SUCCESS_COPY: Record<string, string> = {
  comp_granted: "Comp ticket granted.",
};

const ERROR_COPY: Record<string, string> = {
  comp_required: "Choose a ticket type and member email.",
  comp_lookup_failed: "Could not find that member or ticket type.",
  comp_save_failed: "Comp tickets could not be saved.",
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

async function getTicketingRows() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const [ticketsResult, statsResult] = await Promise.all([
    supabase
      .from("event_ticket_type")
      .select<TicketAdminRow>(
        "id, event_id, name, price_cents, currency, capacity, max_per_order, status, member_event:event_id(id, title, starts_at, status)"
      )
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase
      .from("event_ticket")
      .select<TicketStatsRow>("ticket_type_id, status")
      .in("status", ["pending", "active", "comp"]),
  ]);

  const stats = new Map<string, { held: number; confirmed: number }>();
  for (const row of (statsResult.data ?? []) as unknown as TicketStatsRow[]) {
    if (!row.ticket_type_id) continue;
    const current = stats.get(row.ticket_type_id) ?? { held: 0, confirmed: 0 };
    if (row.status === "pending") current.held += 1;
    if (row.status === "active" || row.status === "comp") current.confirmed += 1;
    stats.set(row.ticket_type_id, current);
  }

  return {
    tickets: ((ticketsResult.data ?? []) as unknown as TicketAdminRow[]).map((ticket) => ({
      ...ticket,
      stats: stats.get(ticket.id) ?? { held: 0, confirmed: 0 },
    })),
  };
}

export default async function EventTicketingPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, data] = await Promise.all([searchParams, getTicketingRows()]);
  const q = params.q?.toLowerCase().trim() ?? "";
  const status = params.status ?? "all";
  const tickets = data.tickets.filter((ticket) => {
    const searchTarget = `${ticket.name} ${ticket.member_event?.title ?? ""}`.toLowerCase();
    const matchesSearch = !q || searchTarget.includes(q);
    const matchesStatus = status === "all" || ticket.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: "92rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>Ticketing</h1>
          <p className="admin-page-header__subtitle">
            Ticket products live on each event. Use this page to scan sales readiness and grant comp tickets.
          </p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/settings" className="admin-btn admin-btn--outline">Settings</Link>
          <Link href="/admin/events/new" className="admin-btn admin-btn--primary">New ticketed event</Link>
        </div>
      </div>

      {params.success ? <div className="admin-banner admin-banner--success">{SUCCESS_COPY[params.success] ?? "Ticketing updated."}</div> : null}
      {params.error ? <div className="admin-banner admin-banner--error">{ERROR_COPY[params.error] ?? "Ticketing could not be updated."}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <form action={grantEventCompTickets} className="admin-form-card">
          <input type="hidden" name="return_to" value="/admin/events/ticketing" />
          <h2 className="admin-form-section__label" style={{ textWrap: "balance" }}>Grant comp tickets</h2>
          <p className="admin-hint">Comp tickets unlock the event join link and replay without charging the member.</p>
          <label className="admin-form-field mt-4">
            <span className="admin-label">Ticket type</span>
            <select name="ticket_type_id" required className="admin-select">
              <option value="">Choose ticket type</option>
              {tickets.map((ticket) => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.member_event?.title ?? "Event"} - {ticket.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-form-field">
            <span className="admin-label">Member email</span>
            <input name="member_email" type="email" required className="admin-input" placeholder="member@example.com" />
          </label>
          <label className="admin-form-field">
            <span className="admin-label">Quantity</span>
            <input name="quantity" type="number" min="1" max="20" defaultValue="1" className="admin-input" />
          </label>
          <label className="admin-form-field">
            <span className="admin-label">Guest names/emails</span>
            <textarea name="guests" rows={3} className="admin-textarea" placeholder="Optional. One guest per line." />
          </label>
          <label className="admin-form-field">
            <span className="admin-label">Internal note</span>
            <textarea name="grant_note" rows={2} className="admin-textarea" placeholder="Why this ticket is comped." />
          </label>
          <div className="admin-form-actions">
            <button type="submit" className="admin-btn admin-btn--primary">Grant comp ticket</button>
          </div>
        </form>

        <div>
          <form className="admin-form-card mb-5" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <label>
              <span className="admin-label">Search</span>
              <input name="q" defaultValue={params.q ?? ""} className="admin-input" placeholder="Event or ticket" />
            </label>
            <label>
              <span className="admin-label">Status</span>
              <select name="status" defaultValue={status} className="admin-select">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <div style={{ display: "flex", alignItems: "end" }}>
              <button type="submit" className="admin-btn admin-btn--primary">Apply</button>
            </div>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Event</th>
                  <th>Price</th>
                  <th>Capacity</th>
                  <th>Confirmed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <div className="font-semibold text-foreground">{ticket.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Max {ticket.max_per_order} per order</div>
                    </td>
                    <td>
                      {ticket.member_event ? (
                        <Link href={`/admin/events/${ticket.event_id}/edit`} className="text-primary">
                          {ticket.member_event.title}
                        </Link>
                      ) : "None"}
                    </td>
                    <td>{money(ticket.price_cents, ticket.currency)}</td>
                    <td>{ticket.capacity ?? "Unlimited"}</td>
                    <td>{ticket.stats.confirmed}{ticket.stats.held ? ` (${ticket.stats.held} held)` : ""}</td>
                    <td><span className={ticket.status === "active" ? "admin-badge admin-badge--published" : "admin-badge admin-badge--draft"}>{ticket.status}</span></td>
                  </tr>
                ))}
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground">No ticket types match these filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
