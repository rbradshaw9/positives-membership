
ALTER TABLE video_views
  ADD COLUMN resume_at_seconds numeric NOT NULL DEFAULT 0;
;
