import type { RecurrenceFrequency } from "@/lib/events/types";

export const MAX_GENERATED_OCCURRENCES = 60;

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
  const requestedCount = !params.count || params.count <= 0 ? MAX_GENERATED_OCCURRENCES : params.count;
  const maxCount = Math.min(Math.max(requestedCount, 1), MAX_GENERATED_OCCURRENCES);
  let current = params.startsAt;

  while (occurrences.length < maxCount) {
    if (params.until && current.getTime() > params.until.getTime()) break;
    occurrences.push({ startsAt: current, endsAt: new Date(current.getTime() + duration) });
    current = addFrequency(current, params.frequency, params.interval);
  }

  return occurrences;
}
