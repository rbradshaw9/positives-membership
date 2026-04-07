
-- Seed progress rows from activity_events so the heatmap has real data
-- Only inserts where no completed progress row already exists for that content
INSERT INTO progress (member_id, content_id, completed, listened_at)
SELECT 
  ae.member_id,
  ae.content_id,
  true,
  ae.occurred_at
FROM activity_event ae
WHERE ae.member_id = '2f343d24-e119-4fb1-bf1c-8b3befebd251'
  AND ae.event_type = 'daily_listened'
  AND ae.content_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM progress p 
    WHERE p.member_id = ae.member_id 
      AND p.content_id = ae.content_id 
      AND p.completed = true
  );
;
