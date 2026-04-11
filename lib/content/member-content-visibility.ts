import { getEffectiveDate, getEffectiveMonthYear } from "@/lib/dates/effective-date";

type VisibilityCandidate = {
  title?: string | null;
  excerpt?: string | null;
  description?: string | null;
  tags?: string[] | null;
  publish_date?: string | null;
  week_start?: string | null;
  month_year?: string | null;
};

const PLACEHOLDER_PATTERNS = [
  /\bplaceholder\b/i,
  /\bqa fixture\b/i,
  /^e2e\b/i,
] as const;

export function matchesPlaceholderText(value: string | null | undefined) {
  if (!value) return false;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

export function hasPlaceholderSignals(candidate: Pick<
  VisibilityCandidate,
  "title" | "excerpt" | "description" | "tags"
>) {
  return (
    matchesPlaceholderText(candidate.title) ||
    matchesPlaceholderText(candidate.excerpt) ||
    matchesPlaceholderText(candidate.description) ||
    (candidate.tags ?? []).some((tag) => matchesPlaceholderText(tag))
  );
}

function isFutureDay(value: string | null | undefined, effectiveDate: string) {
  return Boolean(value && value > effectiveDate);
}

function isFutureWeek(value: string | null | undefined, effectiveDate: string) {
  return Boolean(value && value > effectiveDate);
}

function isFutureMonth(value: string | null | undefined, effectiveMonthYear: string) {
  return Boolean(value && value > effectiveMonthYear);
}

export function shouldHideFromMembers(candidate: VisibilityCandidate) {
  if (hasPlaceholderSignals(candidate)) {
    return true;
  }

  const effectiveDate = getEffectiveDate();
  const effectiveMonthYear = getEffectiveMonthYear();

  if (isFutureDay(candidate.publish_date, effectiveDate)) {
    return true;
  }

  if (isFutureWeek(candidate.week_start, effectiveDate)) {
    return true;
  }

  if (isFutureMonth(candidate.month_year, effectiveMonthYear)) {
    return true;
  }

  return false;
}
