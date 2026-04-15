-- Private storage bucket for internal admin/coach member documents.
-- Files are accessed only through server-side admin routes after permission checks.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'member-documents',
  'member-documents',
  false,
  10485760,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
