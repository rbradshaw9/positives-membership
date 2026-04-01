/**
 * lib/greeting.ts
 * Time-aware member greeting helper.
 *
 * Uses Eastern time (the canonical timezone for Positives content).
 * Returns "Good morning", "Good afternoon", or "Good evening"
 * optionally personalized with the member's first name.
 */

function getEasternHour(): number {
  const now = new Date();
  const eastern = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).format(now);
  return parseInt(eastern, 10);
}

export function getGreeting(name?: string | null): string {
  const hour = getEasternHour();

  let timeGreeting: string;
  if (hour < 12) {
    timeGreeting = "Good morning";
  } else if (hour < 17) {
    timeGreeting = "Good afternoon";
  } else {
    timeGreeting = "Good evening";
  }

  // Use first name only (split on space, take first token)
  if (name?.trim()) {
    const firstName = name.trim().split(/\s+/)[0];
    return `${timeGreeting}, ${firstName}`;
  }

  return timeGreeting;
}
