import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SafeImage } from "@/components/media/SafeImage";
import { formatEventDateRange } from "@/lib/events/dates";
import type { EventRow } from "@/lib/queries/get-events";

type MemberEvent = EventRow & {
  member_ticket_access?: boolean;
};

type BadgeTone = "primary" | "secondary" | "muted" | "warning" | "danger";

type Badge = {
  label: string;
  tone: BadgeTone;
};

type EventCta = {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "outline";
  target?: string;
  rel?: string;
};

function badgeClasses(tone: BadgeTone) {
  if (tone === "secondary") return "bg-secondary/10 text-secondary";
  if (tone === "warning") return "bg-amber-100 text-amber-800";
  if (tone === "danger") return "bg-destructive/10 text-destructive";
  if (tone === "muted") return "bg-muted text-muted-foreground";
  return "bg-primary/10 text-primary";
}

function eventModeLabel(event: MemberEvent) {
  if (event.virtual_mode === "zoom" || event.virtual_mode === "manual") {
    return event.event_venue ? "Hybrid" : "Online";
  }
  return event.event_venue?.is_virtual ? "Online" : "In person";
}

function eventHasActiveRsvp(event: MemberEvent) {
  return (event.event_rsvp_type ?? []).some((rsvp) => rsvp.status === "active");
}

export function eventHostNames(event: MemberEvent) {
  const hosts = (event.event_host_assignment ?? []).flatMap((assignment) =>
    assignment.event_host ? [assignment.event_host.name] : []
  );
  if (hosts.length > 0) return hosts.join(", ");
  return event.event_host?.name ?? "";
}

export function eventLocationLabel(event: MemberEvent) {
  if (event.virtual_mode === "zoom" || event.virtual_mode === "manual") {
    return event.event_venue ? `${event.event_venue.name} + online` : "Online event";
  }
  if (!event.event_venue) return "Location to be announced";
  return [event.event_venue.name, event.event_venue.city, event.event_venue.region]
    .filter(Boolean)
    .join(", ");
}

export function eventJoinUrl(event: MemberEvent) {
  if (!event.member_ticket_access) return null;
  if (event.virtual_mode === "manual") return event.manual_join_url;
  if (event.virtual_mode === "zoom") return event.event_zoom_meeting?.join_url ?? null;
  return null;
}

export function eventCostLabel(event: MemberEvent) {
  const tickets = (event.event_ticket_type ?? []).filter((ticket) => ticket.status === "active");
  if (event.ticketing_mode === "ticket_required" && tickets.length > 0) {
    const prices = tickets.map((ticket) => ticket.price_cents).filter((price) => Number.isFinite(price));
    if (prices.length === 0) return "Ticket required";
    const lowest = Math.min(...prices);
    if (lowest <= 0) return "Free";
    return `From ${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: tickets[0]?.currency?.toUpperCase() ?? "USD",
      maximumFractionDigits: lowest % 100 === 0 ? 0 : 2,
    }).format(lowest / 100)}`;
  }
  return eventHasActiveRsvp(event) ? "Free RSVP" : "Included";
}

export function getEventBadges(event: MemberEvent, nowMs: number): Badge[] {
  const starts = new Date(event.starts_at).getTime();
  const ends = new Date(event.ends_at).getTime();
  const isLive = starts <= nowMs && ends >= nowMs;
  const isPast = ends < nowMs;
  const badges: Badge[] = [{ label: eventModeLabel(event), tone: "primary" }];

  if (event.status === "canceled") badges.push({ label: "Canceled", tone: "danger" });
  if (event.status === "postponed") badges.push({ label: "Postponed", tone: "warning" });
  if (isLive) badges.push({ label: "Happening now", tone: "secondary" });
  if (isPast) badges.push({ label: "Past event", tone: "muted" });

  if (event.ticketing_mode === "ticket_required") {
    badges.push({
      label: event.member_ticket_access ? "Ticket confirmed" : "Ticket required",
      tone: event.member_ticket_access ? "secondary" : "warning",
    });
  } else if (eventHasActiveRsvp(event)) {
    badges.push({ label: "RSVP", tone: "secondary" });
  } else {
    badges.push({ label: "Free", tone: "muted" });
  }

  return badges;
}

export function getEventCta(event: MemberEvent, nowMs: number): EventCta {
  const isPast = new Date(event.ends_at).getTime() < nowMs;
  const joinUrl = eventJoinUrl(event);

  if (joinUrl && !isPast) {
    return {
      label: "Join Event",
      href: joinUrl,
      variant: "primary",
      target: "_blank",
      rel: "noopener noreferrer",
    };
  }

  if (!isPast && event.ticketing_mode === "ticket_required" && !event.member_ticket_access) {
    return {
      label: "Get Tickets",
      href: `/events/${event.id}#event-registration`,
      variant: "primary",
    };
  }

  if (!isPast && eventHasActiveRsvp(event) && !event.member_rsvp_attendee) {
    return {
      label: "RSVP",
      href: `/events/${event.id}#event-registration`,
      variant: "primary",
    };
  }

  return {
    label: "View Event",
    href: `/events/${event.id}`,
    variant: "secondary",
  };
}

export function EventStatusBadges({
  event,
  nowMs,
  className,
}: {
  event: MemberEvent;
  nowMs: number;
  className?: string;
}) {
  return (
    <div className={["flex flex-wrap items-center gap-2", className ?? ""].filter(Boolean).join(" ")}>
      {getEventBadges(event, nowMs).map((badge) => (
        <span
          key={`${badge.label}-${badge.tone}`}
          className={[
            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
            badgeClasses(badge.tone),
          ].join(" ")}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

export function EventVisual({
  event,
  priority = false,
  className,
}: {
  event: MemberEvent;
  priority?: boolean;
  className?: string;
}) {
  const label = event.event_type?.name ?? "Event";
  return (
    <div
      className={[
        "relative isolate aspect-video overflow-hidden rounded-[1.25rem] border border-border bg-surface-tint",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {event.image_url ? (
        <SafeImage
          src={event.image_url}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 44vw"
          preload={priority}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-end bg-[radial-gradient(ellipse_at_20%_10%,rgba(46,196,182,0.24),transparent_50%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(232,246,243,0.88))] p-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            {label}
          </span>
          <span className="mt-2 max-w-56 font-heading text-xl font-semibold leading-tight tracking-normal text-foreground">
            {event.title}
          </span>
        </div>
      )}
    </div>
  );
}

export function MemberEventCard({
  event,
  nowMs,
  compact = false,
}: {
  event: MemberEvent;
  nowMs: number;
  compact?: boolean;
}) {
  const cta = getEventCta(event, nowMs);
  const hosts = eventHostNames(event);
  const location = eventLocationLabel(event);

  return (
    <SurfaceCard
      as="article"
      elevated
      className={[
        "overflow-hidden p-0",
        compact ? "md:grid md:grid-cols-[11rem_minmax(0,1fr)]" : "md:grid md:grid-cols-[15rem_minmax(0,1fr)]",
      ].join(" ")}
    >
      <Link href={`/events/${event.id}`} className="block" aria-label={`View ${event.title}`}>
        <EventVisual
          event={event}
          className={compact ? "h-full min-h-40 rounded-none border-0" : "h-full min-h-48 rounded-none border-0"}
        />
      </Link>
      <div className="flex min-w-0 flex-col gap-4 p-5">
        <EventStatusBadges event={event} nowMs={nowMs} />
        <div>
          <h2 className="heading-balance font-heading text-xl font-semibold leading-tight tracking-normal text-foreground">
            <Link href={`/events/${event.id}`} className="hover:text-primary">
              {event.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm font-medium text-foreground/80">
            {formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{location}</p>
          {hosts ? (
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Hosted by {hosts}
            </p>
          ) : null}
        </div>
        {(event.excerpt ?? event.description) ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {event.excerpt ?? event.description}
          </p>
        ) : null}
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eventCostLabel(event)}
          </span>
          <Button
            href={cta.href}
            variant={cta.variant}
            size="sm"
            target={cta.target}
            rel={cta.rel}
            className="w-full justify-center sm:w-auto"
          >
            {cta.label}
          </Button>
        </div>
      </div>
    </SurfaceCard>
  );
}
