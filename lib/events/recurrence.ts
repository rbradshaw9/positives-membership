import type { RecurrenceFrequency } from "@/lib/events/types";

function addFrequency(date: Date, frequency: RecurrenceFrequency, interval: number) {
  const next = new Date(date);
  if (frequency === "daily") next.setUTCDate(next.getUTCDate() + interval);
  if (frequency === "weekly") next.setUTCDate(next.getUTCDate() + interval * 7);
  if (frequency === "monthly") next.setUTCMonth(next.getUTCMonth() + interval);
  return next;
}

export function expandOccurrences(params: {
  startsAt: Date;
  endsAt: Date;
  frequency: RecurrenceFrequency;
  interval: number;
  count?: number | null;
  until?: Date | null;
}) {
  const duration = params.endsAt.getTime() - params.startsAt.getTime();
  const occurrences: Array<{ startsAt: Date; endsAt: Date }> = [];
  const maxCount = Math.min(Math.max(params.count ?? 1, 1), 60);
  let current = params.startsAt;

  while (occurrences.length < maxCount) {
    if (params.until && current.getTime() > params.until.getTime()) break;
    occurrences.push({ startsAt: current, endsAt: new Date(current.getTime() + duration) });
    current = addFrequency(current, params.frequency, params.interval);
  }

  return occurrences;
}
