
-- Backfill month_year on weekly_principle rows that have it null
-- Derives from week_start (YYYY-MM from the Monday date)
UPDATE content
SET month_year = TO_CHAR(week_start::date, 'YYYY-MM')
WHERE type = 'weekly_principle'
  AND status = 'published'
  AND month_year IS NULL
  AND week_start IS NOT NULL;
;
