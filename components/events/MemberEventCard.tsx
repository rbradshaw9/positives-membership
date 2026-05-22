import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
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
  href?: string;
  variant: "primary" | "secondary" | "outline";
  target?: string;
  rel?: string;
};

const JOIN_WINDOW_MS = 60 * 60 * 1000;

function badgeClasses(tone: BadgeTone) {
  if (tone === "secondary") return "bg-secondary/10 text-secondary";
  if (tone === "warning") return "bg-amber-100 text-amber-800";
  if (tone === "danger") return "bg-destructive/10 text-destructive";
  if (tone === "muted") return "bg-muted text-muted-foreground";
  return "bg-primary/10 text-primary";
}

function isOnlineOnlyVenue(event: MemberEvent) {
  const venueName = event.event_venue?.name.trim().toLowerCase();
  return Boolean(event.event_venue?.is_virtual || venueName === "zoom" || venueName === "online" || venueName === "livekit");
}

function eventModeLabel(event: MemberEvent) {
  if (event.virtual_mode === "zoom" || event.virtual_mode === "manual" || event.virtual_mode === "livekit") {
    return event.event_venue && !isOnlineOnlyVenue(event) ? "Hybrid" : "Online";
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
  if (event.virtual_mode === "zoom" || event.virtual_mode === "manual" || event.virtual_mode === "livekit") {
    return event.event_venue && !isOnlineOnlyVenue(event) ? `${event.event_venue.name} + online` : "Online event";
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
  if (event.virtual_mode === "livekit") return `/events/${event.id}/live`;
  return null;
}

export function eventCanJoin(event: MemberEvent, nowMs: number) {
  const starts = new Date(event.starts_at).getTime();
  const ends = new Date(event.ends_at).getTime();
  return nowMs >= starts - JOIN_WINDOW_MS && nowMs <= ends;
}

export function eventCostLabel(event: MemberEvent) {
  const tickets = (event.event_ticket_type ?? []).filter((ticket) => ticket.status === "active");
  if (event.ticketing_mode === "ticket_required" && tickets.length > 0) {
    const prices = tickets.map((ticket) => ticket.price_cents).filter((price) => Number.isFinite(price));
    if (prices.length === 0) return "Ticket required";
    const lowest = Math.min(...prices);
    if (lowest <= 0) return "Free for members";
    return `From ${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: tickets[0]?.currency?.toUpperCase() ?? "USD",
      maximumFractionDigits: lowest % 100 === 0 ? 0 : 2,
    }).format(lowest / 100)}`;
  }
  return "Free for members";
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
    if (!eventCanJoin(event, nowMs)) {
      return {
        label: "Join event",
        variant: "outline",
      };
    }

    const isExternal = /^https?:\/\//.test(joinUrl);
    return {
      label: "Join event",
      href: joinUrl,
      variant: "primary",
      target: isExternal ? "_blank" : undefined,
      rel: isExternal ? "noopener noreferrer" : undefined,
    };
  }

  if (!isPast && event.ticketing_mode === "ticket_required" && !event.member_ticket_access) {
    return {
      label: "Get tickets",
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
    label: "View event",
    href: `/events/${event.id}`,
    variant: "outline",
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
  const month = formatInTimeZone(new Date(event.starts_at), event.timezone, "MMM");
  const day = formatInTimeZone(new Date(event.starts_at), event.timezone, "d");
  const time = formatInTimeZone(new Date(event.starts_at), event.timezone, "h:mm a zzz");
  const location = eventLocationLabel(event);
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
        <div className="flex h-full w-full flex-col justify-between bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(232,246,243,0.9))] p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              {label}
            </span>
            <span className="grid min-w-16 overflow-hidden rounded-xl border border-border bg-card text-center shadow-sm">
              <span className="bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                {month}
              </span>
              <span className="px-2 py-2 font-heading text-2xl font-bold leading-none text-foreground">
                {day}
              </span>
            </span>
          </div>
          <div>
            <span className="block max-w-72 font-heading text-xl font-semibold leading-tight tracking-normal text-foreground">
              {event.title}
            </span>
            <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {time}
            </span>
            <span className="mt-1 block truncate text-sm text-muted-foreground">
              {location}
            </span>
          </div>
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
          {cta.href ? (
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
          ) : (
            <Button
              type="button"
              variant={cta.variant}
              size="sm"
              disabled
              className="w-full justify-center sm:w-auto"
            >
              {cta.label}
            </Button>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}
