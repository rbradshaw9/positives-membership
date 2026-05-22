import Link from "next/link";
import { saveEventSettings } from "./actions";
import { EVENT_ACCESS_LEVELS, accessLevelLabel } from "@/lib/events/types";
import { getEventSettingsOptions } from "@/lib/queries/get-events";

export const metadata = {
  title: "Event Settings - Positives Admin",
};

type SearchParams = Promise<{ error?: string; success?: string }>;

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

const SUCCESS_COPY: Record<string, string> = {
  settings_saved: "Event defaults saved.",
};

const ERROR_COPY: Record<string, string> = {
  settings_save_failed: "Event defaults could not be saved.",
};

function StatCard({ label, value, href }: { label: string; value: string | number; href: string }) {
  return (
    <Link href={href} className="surface-card p-4 transition-colors hover:border-primary/35">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{value}</p>
    </Link>
  );
}

function HealthCard({
  label,
  status,
  detail,
  href,
  tone = "neutral",
}: {
  label: string;
  status: string;
  detail: string;
  href?: string;
  tone?: "healthy" | "warning" | "neutral";
}) {
  const badgeClass =
    tone === "healthy"
      ? "admin-badge admin-badge--published"
      : tone === "warning"
        ? "admin-badge admin-badge--review"
        : "admin-badge admin-badge--draft";
  const content = (
    <div className="surface-card p-4 transition-colors hover:border-primary/35">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className={badgeClass}>{status}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function settingText(value: unknown) {
  if (Array.isArray(value)) return value.map((entry) => accessLevelLabel(String(entry))).join(", ");
  return String(value ?? "");
}

export default async function EventSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, settings] = await Promise.all([searchParams, getEventSettingsOptions()]);
  const zoomHealthy = settings.zoomConnections.filter((connection) => connection.status === "active").length;
  const activeTicketTypes = settings.recentTicketTypes.filter((ticket) => ticket.status === "active").length;
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const stripeWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

  return (
    <div style={{ maxWidth: "92rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>
            Event Settings
          </h1>
          <p className="admin-page-header__subtitle">
            Defaults and health checks live here. Event types, hosts, venues, and ticketing each have their own focused page.
          </p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events?view=calendar" className="admin-btn admin-btn--outline">Calendar</Link>
          <Link href="/admin/events/new" className="admin-btn admin-btn--primary">New event</Link>
        </div>
      </div>

      {params.success ? (
        <div className="admin-banner admin-banner--success">
          {SUCCESS_COPY[params.success] ?? "Event settings updated."}
        </div>
      ) : null}
      {params.error ? (
        <div className="admin-banner admin-banner--error">
          {ERROR_COPY[params.error] ?? "Event settings could not be saved."}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Types" value={settings.types.length} href="/admin/events/types" />
        <StatCard label="Hosts" value={settings.hosts.length} href="/admin/events/hosts" />
        <StatCard label="Venues" value={settings.venues.length} href="/admin/events/venues" />
        <StatCard label="Active tickets" value={activeTicketTypes} href="/admin/events/ticketing" />
        <StatCard label="Zoom accounts" value={`${zoomHealthy}/${settings.zoomConnections.length}`} href="/admin/integrations/zoom" />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard
          label="Zoom health"
          status={zoomHealthy > 0 ? "Ready" : "Needs setup"}
          tone={zoomHealthy > 0 ? "healthy" : "warning"}
          href="/admin/integrations/zoom"
          detail={zoomHealthy > 0 ? "At least one active Zoom connection can be attached to events." : "Connect Zoom before publishing Zoom-only live events."}
        />
        <HealthCard
          label="Stripe"
          status={stripeConfigured ? "Configured" : "Missing"}
          tone={stripeConfigured ? "healthy" : "warning"}
          href="/admin/events/ticketing"
          detail={stripeConfigured ? "Paid event tickets can create payment or checkout sessions." : "STRIPE_SECRET_KEY is not available to this runtime."}
        />
        <HealthCard
          label="Stripe webhook"
          status={stripeWebhookConfigured ? "Configured" : "Missing"}
          tone={stripeWebhookConfigured ? "healthy" : "warning"}
          href="/admin/events/ticketing"
          detail={stripeWebhookConfigured ? "Ticket payment, refund, and chargeback events can be verified." : "STRIPE_WEBHOOK_SECRET is required for production ticket lifecycle updates."}
        />
        <HealthCard
          label="Door ops"
          status="Ready"
          tone="healthy"
          href="/admin/events/attendees/check-in"
          detail="Manual check-in is available for security codes, ticket codes, names, and emails."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <form action={saveEventSettings} className="admin-form-card">
          <input type="hidden" name="return_to" value="/admin/events/settings" />
          <h2 className="admin-form-section__label" style={{ textWrap: "balance" }}>Defaults</h2>
          <p className="admin-hint">
            These defaults keep new event setup fast. Admins can still override them on each event.
          </p>

          <div className="admin-form-grid-2 mt-4">
            <label className="admin-form-field">
              <span className="admin-label">Default timezone</span>
              <select name="default_timezone" defaultValue={settings.defaults.timezone} className="admin-select">
                {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
              </select>
            </label>
            <label className="admin-form-field">
              <span className="admin-label">Default max per order</span>
              <input
                name="default_max_per_order"
                type="number"
                min="1"
                max="20"
                defaultValue={settings.defaults.defaultMaxPerOrder}
                className="admin-input"
              />
            </label>
          </div>

          <div className="admin-form-field mt-4">
            <span className="admin-label">Default access levels</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {EVENT_ACCESS_LEVELS.map((level) => (
                <label key={level.value} className="rounded-xl border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="default_access_levels"
                    value={level.value}
                    defaultChecked={settings.defaults.accessLevels.includes(level.value)}
                    className="mr-2 h-4 w-4"
                  />
                  {level.label}
                </label>
              ))}
            </div>
          </div>

          <label className="admin-form-field mt-4">
            <span className="admin-label">Ticket sales close</span>
            <select name="ticket_sales_close" defaultValue="event_start" className="admin-select">
              <option value="event_start">At event start</option>
            </select>
          </label>

          <div className="admin-form-actions">
            <button type="submit" className="admin-btn admin-btn--primary">Save defaults</button>
          </div>
        </form>

        <aside className="grid gap-4">
          <div className="surface-card p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Current defaults</p>
            <dl className="mt-3 grid gap-2 text-sm">
              {settings.settings.map((setting) => (
                <div key={setting.key} className="rounded-lg bg-muted/40 p-2">
                  <dt className="font-semibold text-foreground">{setting.key.replaceAll("_", " ")}</dt>
                  <dd className="mt-1 text-muted-foreground">{settingText(setting.value)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="surface-card p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Quick links</p>
            <div className="mt-3 grid gap-2">
              <Link href="/admin/events/types" className="admin-btn admin-btn--outline">Manage types</Link>
              <Link href="/admin/events/hosts" className="admin-btn admin-btn--outline">Manage hosts</Link>
              <Link href="/admin/events/venues" className="admin-btn admin-btn--outline">Manage venues</Link>
              <Link href="/admin/events/attendees/check-in" className="admin-btn admin-btn--outline">Check-in</Link>
              <Link href="/admin/events/ticketing" className="admin-btn admin-btn--outline">Ticketing</Link>
              <Link href="/admin/integrations/zoom" className="admin-btn admin-btn--outline">Zoom integrations</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
