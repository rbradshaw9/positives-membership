# Daily Content — Manual Publishing Guide

## Overview

Before the automated ingestion pipeline is built (Milestone 05+), daily audio content
is created manually through the admin interface. This guide covers the full flow from
creating a record to verifying it appears correctly on `/today`.

---

## Step 1 — Sign in to admin

Navigate to `/admin` using an account listed in the `ADMIN_EMAILS` env var.

---

## Step 2 — Create a daily audio record

Go to `/admin/content` and click **"+ Add daily audio"**.

Fill in the form:

| Field | Required | Notes |
|---|---|---|
| Title | Yes | Shown to members on `/today` |
| Description | No | Shown below title |
| Duration (seconds) | No | e.g. `480` = 8 minutes |
| Publish date | No | Defaults to today |
| Status | Yes | Set to **Active** to show on `/today` |
| Castos episode URL | No | Direct `.mp3` URL — preferred playback source |
| S3 object key | No | Fallback if no Castos URL |

> **Audio source priority:**
> `castos_episode_url` is used first.
> `s3_audio_key` is the fallback (S3 signed URL generation is a future milestone).
> If neither is set, the card shows "audio not yet available" gracefully.

Click **Save content** — you'll be redirected to the content list on success.

---

## Step 3 — Verify on `/today`

1. Open a browser tab as an active member (or use your admin account if it has an active subscription)
2. Navigate to `/today`
3. The DailyPracticeCard should show:
   - Real title and description from the row you created
   - A working audio player if you provided a Castos URL or accessible S3 URL
   - "Audio not yet available" if no source was set

---

## Step 4 — Verify in Supabase

Run this query to confirm the row is correct:

```sql
SELECT id, title, type, is_active, published_at, castos_episode_url, s3_audio_key
FROM content
WHERE type = 'daily_audio'
ORDER BY published_at DESC
LIMIT 5;
```

---

## Making a record the active daily practice

Only one record is shown on `/today` — the latest row where `is_active = true`.

To switch which episode is shown:

```sql
-- Deactivate all daily audio
UPDATE content SET is_active = false WHERE type = 'daily_audio';

-- Activate the one you want
UPDATE content SET is_active = true WHERE id = 'your-content-id-here';
```

---

## Required fields summary (for `/today` to work)

| Field | Why it matters |
|---|---|
| `type = 'daily_audio'` | Fixed — set automatically by admin form |
| `is_active = true` | Row must be active to appear on `/today` |
| `title` | Displayed to members |
| `castos_episode_url` or `s3_audio_key` | Needed for audio playback |

---

## Future: how ingestion will replace this

When the Google Drive ingestion pipeline is built:

1. Dr. Paul uploads audio to Google Drive
2. The system ingests → S3 → transcription → AI metadata
3. An admin reviews and approves content in the admin dashboard
4. Approval sets `is_active = true` and publishes to Castos
5. `/today` automatically picks up the new content

Until then, this manual flow is the publishing path.
