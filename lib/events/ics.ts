function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildEventIcs(params: {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  url: string;
}) {
  const now = icsDate(new Date().toISOString());
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Positives//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.id}@positives.life`,
    `DTSTAMP:${now}`,
    `DTSTART:${icsDate(params.startsAt)}`,
    `DTEND:${icsDate(params.endsAt)}`,
    `SUMMARY:${escapeIcs(params.title)}`,
    params.description ? `DESCRIPTION:${escapeIcs(params.description)}` : null,
    params.location ? `LOCATION:${escapeIcs(params.location)}` : null,
    `URL:${escapeIcs(params.url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
